import React from 'react';


const RefundPolicy = () => (
  <div className="legal-container" style={{
    backgroundColor: '#0B0B1A',
    color: '#FFFFFF',
    minHeight: '100vh',
    padding: '40px 20px',
    maxWidth: '800px',
    margin: '0 auto'
  }}>
    <h1 style={{
      color: '#FF4EC9',
      textAlign: 'center',
      marginBottom: '40px',
      fontSize: '2.5rem',
      fontWeight: 'bold'
    }}>Refund Policy</h1>

    <section className="section" style={{
      backgroundColor: '#1A1036',
      padding: '30px',
      margin: '20px 0',
      borderRadius: '12px',
      border: '1px solid #4DBFFF'
    }}>
      <h2 style={{
        color: '#4DBFFF',
        fontSize: '1.5rem',
        marginBottom: '15px'
      }}>4. Exceptional Circumstances</h2>
      <p style={{
        color: '#FFFFFF',
        lineHeight: '1.6',
        fontSize: '1rem'
      }}>
        Refunds may be granted, at our sole and absolute discretion, in cases of duplicate charges, proven technical errors resulting in incorrect billing, vendor cancellation of confirmed orders, or other extenuating circumstances beyond the customer's control. <br></br><br></br>To request a refund under these circumstances, you must contact us at <a href="mailto:flavor@grubana.com" style={{ color: '#00E676', textDecoration: 'underline' }}>flavor@grubana.com</a> within 14 days of the charge and provide all relevant details and supporting documentation. Grubana's decision regarding refunds is final.
      </p>
    </section>

    <section className="section" style={{
      backgroundColor: '#1A1036',
      padding: '30px',
      margin: '20px 0',
      borderRadius: '12px',
      border: '1px solid #4DBFFF'
    }}>
      <h2 style={{
        color: '#4DBFFF',
        fontSize: '1.5rem',
        marginBottom: '15px'
      }}>5. Changes to This Policy</h2>
      <p style={{
        color: '#FFFFFF',
        lineHeight: '1.6',
        fontSize: '1rem'
      }}>
        All pre-order payments and fees made through Grubana are <strong style={{ color: '#FF4EC9' }}>non-refundable</strong> except as expressly required by applicable law or as otherwise stated in this policy. <br></br><br></br>By placing a pre-order through our platform, you acknowledge and agree that you are not entitled to a refund or credit for your order, including for accidental purchases, change of mind, or dissatisfaction with the food vendor's service. <br></br><br></br>Grubana charges a 5% processing fee on all pre-orders to maintain and improve our platform services. This fee is included in your total payment and is non-refundable.
      </p>
    </section>

    <section className="section" style={{
      backgroundColor: '#1A1036',
      padding: '30px',
      margin: '20px 0',
      borderRadius: '12px',
      border: '1px solid #4DBFFF'
    }}>
      <h2 style={{
        color: '#4DBFFF',
        fontSize: '1.5rem',
        marginBottom: '15px'
      }}>2. Order Cancellation</h2>
      <p style={{
        color: '#FFFFFF',
        lineHeight: '1.6',
        fontSize: '1rem'
      }}>
        You may cancel a pre-order only if the vendor has not yet confirmed or begun preparing your order. Contact the vendor directly or reach out to customer support immediately after placing your order if you need to cancel. <strong style={{ color: '#FF4EC9' }}>No refunds or credits</strong> will be issued for orders that have been confirmed by the vendor, are in preparation, or have been completed.
      </p>
    </section>

    <section className="section" style={{
      backgroundColor: '#1A1036',
      padding: '30px',
      margin: '20px 0',
      borderRadius: '12px',
      border: '1px solid #4DBFFF'
    }}>
      <h2 style={{
        color: '#4DBFFF',
        fontSize: '1.5rem',
        marginBottom: '15px'
      }}>3. Chargebacks and Disputes</h2>
      <p style={{
        color: '#FFFFFF',
        lineHeight: '1.6',
        fontSize: '1rem'
      }}>
        Initiating a chargeback or payment dispute without first contacting Grubana to resolve the issue may result in the immediate suspension or termination of your account. We reserve the right to dispute any chargeback and to recover any costs or fees incurred as a result.
      </p>
    </section>

        <section className="section" style={{
      backgroundColor: '#1A1036',
      padding: '30px',
      margin: '20px 0',
      borderRadius: '12px',
      border: '1px solid #4DBFFF'
    }}>
      <h2 style={{
        color: '#4DBFFF',
        fontSize: '1.5rem',
        marginBottom: '15px'
      }}>4. Exceptional Circumstances</h2>
      <p style={{
        color: '#FFFFFF',
        lineHeight: '1.6',
        fontSize: '1rem'
      }}>
       Refunds may be granted, at our sole and absolute discretion, in cases of duplicate charges, proven technical errors resulting in incorrect billing, or other extenuating circumstances. <br></br><br></br>To request a refund under these circumstances, you must contact us at <a href="mailto:flavor@grubana.com">flavor@grubana.com</a> within 14 days of the charge and provide all relevant details and supporting documentation. Grubana’s decision regarding refunds is final.
      </p>
    </section>

    <section className="section" style={{
      backgroundColor: '#1A1036',
      padding: '30px',
      margin: '20px 0',
      borderRadius: '12px',
      border: '1px solid #4DBFFF'
    }}>
      <h2 style={{
        color: '#4DBFFF',
        fontSize: '1.5rem',
        marginBottom: '15px'
      }}>5. Changes to This Policy</h2>
      <p style={{
        color: '#FFFFFF',
        lineHeight: '1.6',
        fontSize: '1rem'
      }}>
        Grubana reserves the right to modify or update this Refund Policy at any time, at its sole discretion. Any changes will be effective immediately upon posting on this page. Your continued use of the Platform after changes are posted constitutes your acceptance of those changes.
      </p>
    </section>

    <section className="section" style={{
      backgroundColor: '#1A1036',
      padding: '30px',
      margin: '20px 0',
      borderRadius: '12px',
      border: '1px solid #4DBFFF'
    }}>
      <h2 style={{
        color: '#4DBFFF',
        fontSize: '1.5rem',
        marginBottom: '15px'
      }}>6. Contact Us</h2>
      <p style={{
        color: '#FFFFFF',
        lineHeight: '1.6',
        fontSize: '1rem'
      }}>
        If you have any questions about this Refund Policy or wish to request a refund, please contact us at <a href="mailto:flavor@grubana.com" style={{ color: '#00E676', textDecoration: 'underline' }}>flavor@grubana.com</a>.
      </p>
    </section>

    <a
  href="#"
  onClick={e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  style={{
    display: "block",
    textAlign: "center",
    margin: "40px auto 0 auto",
    color: "#4DBFFF",
    textDecoration: "underline",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1.1rem",
    maxWidth: "200px"
  }}
>
  Back to Top ↑
</a>
  </div>
);

export default RefundPolicy;