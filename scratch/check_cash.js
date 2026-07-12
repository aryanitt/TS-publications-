const pool = require("../backend/config/db");

(async () => {
  try {
    console.log("Fetching cash collections:");
    const res = await pool.query("SELECT id, tenant_id, lead_id, employee_id, amount, payment_at FROM cash_collections");
    console.log(res.rows);

    console.log("\nFetching employees:");
    const empRes = await pool.query("SELECT id, name, email FROM employees");
    console.log(empRes.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit();
  }
})();
