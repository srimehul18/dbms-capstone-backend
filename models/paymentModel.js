
import db from "../config/db.js"

const validStatuses = [
  "Successful",
  "Pending",
  "Failed",
  "Refunded"
]

const paymentSelect = `
  SELECT
    p.payment_id AS id,
    p.bill_id AS billId,
    (
      SELECT r.name
      FROM resident r
      JOIN maintenancebill mb2
        ON mb2.apartment_id = r.apartment_id
      WHERE mb2.bill_id = p.bill_id
      ORDER BY r.resident_id
      LIMIT 1
    ) AS resident,
    DATE_FORMAT(p.pay_date, '%Y-%m-%d') AS payDate,
    p.amount_paid AS amount,
    p.method AS method,
    p.reference_no AS referenceNo,
    p.reference_no AS referenceNo,
p.status AS status,
p.payment_proof_url AS paymentProofUrl,
p.gateway_order_id AS gatewayOrderId,
p.gateway_payment_id AS gatewayPaymentId
FROM payment p
  FROM payment p
`

const getPaymentByIdWithConnection = async (connection, id) => {
  const [rows] = await connection.query(
    `${paymentSelect} WHERE p.payment_id = ?`,
    [id]
  )

  return rows[0] || null
}

const lockBills = async (connection, billIds) => {
  const ids = [...new Set(billIds.map(Number))]
    .sort((a, b) => a - b)

  for (const billId of ids) {
    const [rows] = await connection.query(
      `SELECT bill_id, amount, late_fee
       FROM maintenancebill
       WHERE bill_id = ?
       FOR UPDATE`,
      [billId]
    )

    if (!rows.length) {
      throw new Error(`Maintenance bill ${billId} does not exist.`)
    }
  }
}

const validatePaymentData = ({
  billId,
  amount,
  payDate,
  method,
  status
}) => {
  if (!Number.isInteger(Number(billId)) || Number(billId) <= 0) {
    throw new Error("A valid bill ID is required.")
  }

  if (
    amount === undefined ||
    amount === null ||
    amount === "" ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    throw new Error("Payment amount must be greater than zero.")
  }

  if (!payDate || Number.isNaN(Date.parse(payDate))) {
    throw new Error("A valid payment date is required.")
  }

  if (!method) {
    throw new Error("Payment method is required.")
  }

  if (!validStatuses.includes(status)) {
    throw new Error("Select a valid payment status.")
  }
}

const validateSuccessfulPayment = async (
  connection,
  { billId, amount, payDate },
  excludePaymentId = null
) => {
  const [dateRows] = await connection.query(
    "SELECT CAST(? AS DATETIME) > CURRENT_TIMESTAMP AS is_future",
    [payDate]
  )

  if (Number(dateRows[0].is_future) === 1) {
    throw new Error(
      "A future-dated payment cannot be recorded as successful."
    )
  }

  const [billRows] = await connection.query(
    `SELECT amount, late_fee
     FROM maintenancebill
     WHERE bill_id = ?`,
    [billId]
  )

  if (!billRows.length) {
    throw new Error(`Maintenance bill ${billId} does not exist.`)
  }

  const [paymentRows] = await connection.query(
    `SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
     FROM payment
     WHERE bill_id = ?
       AND status = 'Successful'
       AND pay_date <= CURRENT_TIMESTAMP
       AND (? IS NULL OR payment_id <> ?)`,
    [billId, excludePaymentId, excludePaymentId]
  )

  const totalDue =
    Number(billRows[0].amount) +
    Number(billRows[0].late_fee)

  const totalPaid = Number(paymentRows[0].total_paid)
  const remaining = Math.round((totalDue - totalPaid) * 100) / 100
  const paymentAmount = Math.round(Number(amount) * 100) / 100

  if (remaining <= 0) {
    throw new Error(
      "This bill has no outstanding balance. The payment would exceed the amount due."
    )
  }

  if (paymentAmount > remaining) {
    throw new Error(
      `Payment exceeds the remaining balance of ${remaining.toFixed(2)}.`
    )
  }
}

export const getAllPayments = async () => {
  const [rows] = await db.query(`
    ${paymentSelect}
    ORDER BY p.payment_id DESC
  `)

  return rows
}

export const getPaymentById = async (id) => {
  const [rows] = await db.query(
    `${paymentSelect} WHERE p.payment_id = ?`,
    [id]
  )

  return rows[0] || null
}

export const createPayment = async (data) => {
  const payment = {
    ...data,
    status: data.status || "Pending"
  }

  validatePaymentData(payment)

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    await lockBills(connection, [payment.billId])

    if (payment.status === "Successful") {
      await validateSuccessfulPayment(connection, payment)
    }

    const [result] = await connection.query(
      `INSERT INTO payment
        (bill_id, amount_paid, pay_date, method, reference_no, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payment.billId,
        payment.amount,
        payment.payDate,
        payment.method,
        payment.referenceNo || null,
        payment.status
      ]
    )

    const created = await getPaymentByIdWithConnection(
      connection,
      result.insertId
    )

    await connection.commit()

    return created
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const updatePayment = async (id, data) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [existingRows] = await connection.query(
      `SELECT *
       FROM payment
       WHERE payment_id = ?
       FOR UPDATE`,
      [id]
    )

    if (!existingRows.length) {
      await connection.rollback()
      return null
    }

    const existing = existingRows[0]

    if (existing.status === "Successful") {
      throw new Error(
        "Successful payments cannot be edited. Use a controlled correction or refund process."
      )
    }

    const payment = {
      billId: data.billId,
      amount: data.amount,
      payDate: data.payDate,
      method: data.method,
      referenceNo: data.referenceNo,
      status: data.status || existing.status
    }

    validatePaymentData(payment)

    await lockBills(connection, [
      existing.bill_id,
      payment.billId
    ])

    if (payment.status === "Successful") {
      await validateSuccessfulPayment(
        connection,
        payment,
        Number(id)
      )
    }

    await connection.query(
      `UPDATE payment
       SET bill_id = ?,
           amount_paid = ?,
           pay_date = ?,
           method = ?,
           reference_no = ?,
           status = ?
       WHERE payment_id = ?`,
      [
        payment.billId,
        payment.amount,
        payment.payDate,
        payment.method,
        payment.referenceNo || null,
        payment.status,
        id
      ]
    )

    const updated = await getPaymentByIdWithConnection(
      connection,
      id
    )

    await connection.commit()

    return updated
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const deletePayment = async (id) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [rows] = await connection.query(
      `SELECT payment_id, bill_id, status
       FROM payment
       WHERE payment_id = ?
       FOR UPDATE`,
      [id]
    )

    if (!rows.length) {
      await connection.rollback()
      return false
    }

    const payment = rows[0]

    if (payment.status === "Successful") {
      throw new Error(
        "Successful payments cannot be deleted. Use a controlled correction or refund process."
      )
    }

    await lockBills(connection, [payment.bill_id])

    await connection.query(
      "DELETE FROM payment WHERE payment_id = ?",
      [id]
    )

    await connection.commit()

    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export const savePaymentProof = async (id, imageUrl) => {
  const [existing] = await db.query(
    "SELECT payment_id FROM payment WHERE payment_id = ?",
    [id]
  );

  if (!existing.length) {
    return null;
  }

  await db.query(
    `UPDATE payment
     SET payment_proof_url = ?
     WHERE payment_id = ?`,
    [imageUrl, id]
  );

  return await getPaymentById(id);
};



export const getOutstandingBillAmount = async (billId, residentId) => {
  const [rows] = await db.query(
    `SELECT
       mb.bill_id,
       mb.apartment_id,
       mb.amount,
       mb.late_fee,
       r.resident_id
     FROM maintenancebill mb
     JOIN resident r
       ON r.apartment_id = mb.apartment_id
     WHERE mb.bill_id = ?
       AND r.resident_id = ?
     LIMIT 1`,
    [Number(billId), Number(residentId)]
  );

  if (!rows.length) {
    throw new Error("Bill not found for this resident.");
  }

  const bill = rows[0];

  const [paidRows] = await db.query(
    `SELECT COALESCE(SUM(amount_paid), 0) AS totalPaid
     FROM payment
     WHERE bill_id = ?
       AND status = 'Successful'
       AND pay_date <= CURRENT_TIMESTAMP`,
    [billId]
  );

  const totalDue =
    Number(bill.amount) + Number(bill.late_fee);

  const totalPaid = Number(paidRows[0].totalPaid);

  const amountDue = Math.round(
    (totalDue - totalPaid) * 100
  ) / 100;

  if (amountDue <= 0) {
    throw new Error("This bill has no outstanding balance.");
  }

  return {
    billId: Number(bill.bill_id),
    amountDue
  };
};


export const createPendingRazorpayPayment = async ({
  billId,
  residentId,
  orderId,
  orderAmount
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await lockBills(connection, [billId]);

    const [billRows] = await connection.query(
      `SELECT mb.amount, mb.late_fee, mb.apartment_id
       FROM maintenancebill mb
       JOIN resident r
         ON r.apartment_id = mb.apartment_id
       WHERE mb.bill_id = ?
         AND r.resident_id = ?
       FOR UPDATE`,
      [billId, residentId]
    );

    if (!billRows.length) {
      throw new Error("Bill not found for this resident.");
    }

    const [paidRows] = await connection.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS totalPaid
       FROM payment
       WHERE bill_id = ?
         AND status = 'Successful'`,
      [billId]
    );

    const totalDue =
      Number(billRows[0].amount) +
      Number(billRows[0].late_fee);

    const remaining = Math.round(
      (totalDue - Number(paidRows[0].totalPaid)) * 100
    ) / 100;

    const orderValue = Math.round(orderAmount) / 100;

    if (
      remaining <= 0 ||
      Math.round(remaining * 100) !== Math.round(orderAmount) ||
      Math.abs(remaining - orderValue) > 0.001
    ) {
      throw new Error(
        "The outstanding bill amount has changed. Please try again."
      );
    }

    const [result] = await connection.query(
      `INSERT INTO payment
        (bill_id, amount_paid, pay_date, method,
         reference_no, status, gateway_order_id)
       VALUES (?, ?, CURRENT_TIMESTAMP, 'Razorpay',
               NULL, 'Pending', ?)`,
      [billId, remaining, orderId]
    );

    const payment = await getPaymentByIdWithConnection(
      connection,
      result.insertId
    );

    await connection.commit();

    return payment;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


export const getRazorpayPaymentByOrderId = async (orderId) => {
  const [rows] = await db.query(
    `${paymentSelect}
     WHERE p.gateway_order_id = ?
     LIMIT 1`,
    [orderId]
  );

  return rows[0] || null;
};


export const markRazorpayPaymentSuccessful = async ({
  orderId,
  paymentId
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT payment_id, bill_id, amount_paid, status,
              gateway_payment_id
       FROM payment
       WHERE gateway_order_id = ?
       FOR UPDATE`,
      [orderId]
    );

    if (!rows.length) {
      throw new Error("Razorpay order not found.");
    }

    const existing = rows[0];

    // Make repeated verification requests safe.
    if (existing.status === "Successful") {
      if (existing.gateway_payment_id === paymentId) {
        const payment = await getPaymentByIdWithConnection(
          connection,
          existing.payment_id
        );

        await connection.commit();
        return payment;
      }

      throw new Error("This order has already been paid.");
    }

    await lockBills(connection, [existing.bill_id]);

    await connection.query(
      `UPDATE payment
       SET status = 'Successful',
           reference_no = ?,
           gateway_payment_id = ?
       WHERE payment_id = ?`,
      [paymentId, paymentId, existing.payment_id]
    );

    const [paidRows] = await connection.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS totalPaid
       FROM payment
       WHERE bill_id = ?
         AND status = 'Successful'`,
      [existing.bill_id]
    );

    const [billRows] = await connection.query(
      `SELECT amount, late_fee, due_date
       FROM maintenancebill
       WHERE bill_id = ?`,
      [existing.bill_id]
    );

    const totalDue =
      Number(billRows[0].amount) +
      Number(billRows[0].late_fee);

    const totalPaid = Number(paidRows[0].totalPaid);

    let billStatus = "Pending";

    if (totalPaid >= totalDue) {
      billStatus = "Paid";
    } else if (totalPaid > 0) {
      billStatus = "Partially Paid";
    } else if (
      new Date(billRows[0].due_date) < new Date()
    ) {
      billStatus = "Overdue";
    }

    await connection.query(
      `UPDATE maintenancebill
       SET status = ?
       WHERE bill_id = ?`,
      [billStatus, existing.bill_id]
    );

    const payment = await getPaymentByIdWithConnection(
      connection,
      existing.payment_id
    );

    await connection.commit();

    return payment;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

