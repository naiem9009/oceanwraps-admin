import React from 'react';

const Invoice = () => {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f5f5f5", padding: "20px", margin: 0 }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)" }}>
        {/* Header Section */}
        <div style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EF4444 100%)", color: "white", padding: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "30px" }}>
              <div style={{ width: "40px", height: "40px", background: "rgba(255, 255, 255, 0.2)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "18px", marginRight: "12px" }}>S</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "1px" }}>SEMPURNA</div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", opacity: 0.8 }}>DESIGN STUDIO</div>
              </div>
            </div>
            
            <div>
              <h1 style={{ fontSize: "48px", fontWeight: 700, marginBottom: "8px", letterSpacing: "2px" }}>INVOICE</h1>
              <div style={{ fontSize: "18px", opacity: 0.9, marginBottom: "20px" }}># 8027522</div>
            </div>
            
            <div style={{ fontSize: "14px", opacity: 0.8 }}>
              Sempurna Inc. 10 January 2020
            </div>
          </div>
          
          <div style={{ textAlign: "right", minWidth: "250px" }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>Date Information</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>10 / 01 / 2020</div>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>Invoice Number</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>01 / INV / 2020 / 12</div>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>INVOICE TO:</div>
              <div>
                <div style={{ fontSize: "14px", marginBottom: "2px" }}>Mellisa Inc.</div>
                <div style={{ fontSize: "14px", marginBottom: "2px" }}>270 Old Avenue, New Road</div>
                <div style={{ fontSize: "14px", marginBottom: "2px" }}>New York</div>
              </div>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "16px", fontWeight: 600, opacity: 1 }}>Total Due: USD $90.00</div>
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div style={{ padding: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 100px", background: "#f8f9fa", padding: "20px 40px", fontWeight: 600, fontSize: "14px", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>
            <div>NO.</div>
            <div>Item Description</div>
            <div>Price</div>
            <div>Qty.</div>
            <div>Total</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 100px", padding: "24px 40px", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
            <div style={{ fontWeight: 500, color: "#6b7280" }}>01.</div>
            <div>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Branding Design</div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Lorem ipsum dolor sit lorem ipsum</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>1x</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 100px", padding: "24px 40px", borderBottom: "1px solid #f3f4f6", alignItems: "center", background: "#fafafa" }}>
            <div style={{ fontWeight: 500, color: "#6b7280" }}>02.</div>
            <div>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Logo Design</div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Lorem ipsum dolor sit lorem ipsum</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>1x</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 100px", padding: "24px 40px", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
            <div style={{ fontWeight: 500, color: "#6b7280" }}>03.</div>
            <div>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Keynote Design</div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Lorem ipsum dolor sit lorem ipsum</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>1x</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 100px", padding: "24px 40px", borderBottom: "1px solid #f3f4f6", alignItems: "center", background: "#fafafa" }}>
            <div style={{ fontWeight: 500, color: "#6b7280" }}>04.</div>
            <div>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Corporate Identity Design</div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Lorem ipsum dolor sit lorem ipsum</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>1x</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$20.00</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 80px 100px", padding: "24px 40px", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
            <div style={{ fontWeight: 500, color: "#6b7280" }}>05.</div>
            <div>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>2 Slide Namecard Design</div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>Lorem ipsum dolor sit lorem ipsum</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$10.00</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>1x</div>
            <div style={{ textAlign: "right", fontWeight: 500 }}>$10.00</div>
          </div>
        </div>

        {/* Footer Section */}
        <div style={{ padding: "40px", background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, marginRight: "40px" }}>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#111827", marginBottom: "20px" }}>Thank you for your business</div>
            
            <div style={{ marginBottom: "30px" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px", fontSize: "14px", color: "#6b7280" }}>
                <span style={{ marginRight: "8px", width: "16px" }}>📞</span>
                <span>+908 123 4567</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "8px", fontSize: "14px", color: "#6b7280" }}>
                <span style={{ marginRight: "8px", width: "16px" }}>✉</span>
                <span>meeting@gmail.com</span>
              </div>
            </div>
            
            <div style={{ marginBottom: "30px" }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "8px", fontSize: "14px" }}>PAYMENT METHOD</div>
              <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Bank Account</div>
              <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Bank Full Name</div>
              <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Bank Code</div>
            </div>
            
            <div>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "8px", fontSize: "14px" }}>TERMS & CONDITIONS</div>
              <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>Duis autem vel eum iriure dolor in hendrerit in vulputate</div>
            </div>
          </div>
          
          <div style={{ minWidth: "200px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", color: "#6b7280" }}>
              <span>Sub total</span>
              <span>$90.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", color: "#6b7280" }}>
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", margin: "20px 0 30px 0" }}>
              <div style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EF4444 100%)", color: "white", padding: "12px 24px", borderRadius: "8px", fontWeight: 600, marginRight: "20px" }}>Total</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>$90.00</div>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Steven Joe</div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "20px" }}>Accounting Manager</div>
              <div style={{ width: "120px", height: "40px", margin: "0 auto", backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 40'%3E%3Cpath d='M10 30 Q30 10 50 25 T90 20' stroke='%23374151' stroke-width='2' fill='none'/%3E%3C/svg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;