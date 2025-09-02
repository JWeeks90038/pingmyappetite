import React from 'react';


const RefundPolicy = () => (
  <div className="legal-container">
    <h1>Refund Policy</h1>

    <section className="section">
      <h2>1. No Refunds Policy</h2>
      <p>
        All subscription payments and fees made to Grubana are <strong>non-refundable</strong> except as expressly required by applicable law or as otherwise stated in this policy. <br></br><br></br>By subscribing to our services, you acknowledge and agree that you are not entitled to a refund or credit for any portion of your subscription period, including for unused time, accidental purchases, or dissatisfaction with the service.
      </p>
    </section>

    <section className="section">
      <h2>2. Cancellation</h2>
      <p>
        You may cancel your subscription at any time through your account settings or by contacting customer support. Upon cancellation, your subscription will remain active until the end of the current billing period, after which access to paid features will be revoked. <strong>No refunds or prorated credits</strong> will be issued for partial billing periods, unused services, or automatic renewals.
      </p>
    </section>

    <section className="section">
      <h2>3. Chargebacks and Disputes</h2>
      <p>
        Initiating a chargeback or payment dispute without first contacting Grubana to resolve the issue may result in the immediate suspension or termination of your account. We reserve the right to dispute any chargeback and to recover any costs or fees incurred as a result.
      </p>
    </section>

    <section className="section">
      <h2>4. Exceptional Circumstances</h2>
      <p>
        Refunds may be granted, at our sole and absolute discretion, in cases of duplicate charges, proven technical errors resulting in incorrect billing, or other extenuating circumstances. <br></br><br></br>To request a refund under these circumstances, you must contact us at <a href="mailto:flavor@grubana.com">flavor@grubana.com</a> within 14 days of the charge and provide all relevant details and supporting documentation. Grubana’s decision regarding refunds is final.
      </p>
    </section>

    <section className="section">
      <h2>5. Changes to This Policy</h2>
      <p>
        Grubana reserves the right to modify or update this Refund Policy at any time, at its sole discretion. Any changes will be effective immediately upon posting on this page. Your continued use of the Platform after changes are posted constitutes your acceptance of those changes.
      </p>
    </section>

    <section className="section">
      <h2>6. Contact Us</h2>
      <p>
        If you have any questions about this Refund Policy or wish to request a refund, please contact us at <a href="mailto:flavor@grubana.com">flavor@grubana.com</a>.
      </p>
    </section>

    <a
  href="#"
  onClick={e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  style={{
    display: "inline-block",
    margin: "30px auto 0 auto",
    color: "#2c6f57",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "bold"
  }}
>
  Back to Top ↑
</a>
  </div>
);

export default RefundPolicy;