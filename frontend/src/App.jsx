import { useEffect, useState } from "react";
import "./App.css";
import { QRCodeSVG } from "qrcode.react";
const API = "http://127.0.0.1:8000";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const loginUser = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    const data = await response.json();

    if (data.logged_in) {
      setIsLoggedIn(true);
      setMessage("Login successful!");
    } else {
      setMessage(data.message || "Invalid username or password");
    }
  } catch (error) {
    setMessage("Unable to connect to backend.");
  }
  };
  const [assets, setAssets] = useState([]);

  const [form, setForm] = useState({
    asset_tag: "",
    device_type: "",
    serial_number: "",
    organization: "",
  });

  const [selectedPolicy, setSelectedPolicy] = useState({});
  const [message, setMessage] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [qrData, setQrData] = useState("");
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  
   

  // -----------------------------
  // Get all assets
  // -----------------------------
  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API}/assets`);
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      setMessage("Backend server is not running.");
    }
  };

  useEffect(() => {
  fetchAssets();
  fetchAuditLogs();
}, []); 
  const fetchAuditLogs = async () => {
  try {
    const response = await fetch(`${API}/audit-logs`);
    const data = await response.json();
    setAuditLogs(data.logs || []);
  } catch (error) {
    console.error("Unable to fetch audit logs.");
  }
};

  // -----------------------------
  // Register Asset
  // -----------------------------
  const registerAsset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Asset registered successfully!");
        setForm({
          asset_tag: "",
          device_type: "",
          serial_number: "",
          organization: "",
        });
        fetchAssets();
      } else {
        setMessage(data.message || "Registration failed.");
      }
    } catch (error) {
      setMessage("Unable to connect to backend.");
    }

    setLoading(false);
  };

  // -----------------------------
  // Select Wipe Policy
  // -----------------------------
  const selectPolicy = async (assetId) => {
    const policy = selectedPolicy[assetId];

    if (!policy) {
      setMessage("Please select a wipe policy first.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/assets/${assetId}/wipe-policy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            policy: policy,
          }),
        }
      );

      const data = await response.json();
      setMessage(data.message);

      fetchAssets();
    } catch (error) {
      setMessage("Unable to select wipe policy.");
    }
  };

  // -----------------------------
  // Start Wipe
  // -----------------------------
  const startWipe = async (assetId) => {
    try {
      const response = await fetch(`${API}/assets/${assetId}/wipe`, {
        method: "POST",
      });

      const data = await response.json();

      setMessage(data.message);
      fetchAssets();
    } catch (error) {
      setMessage("Unable to start wiping.");
    }
  };

  // -----------------------------
  // Verify Wipe
  // -----------------------------
  const verifyWipe = async (assetId) => {
    try {
      const response = await fetch(`${API}/assets/${assetId}/verify`);
      const data = await response.json();

      if (data.verified) {
        setMessage("Wipe verified successfully!");
      } else {
        setMessage("Wipe verification failed.");
      }
    } catch (error) {
      setMessage("Unable to verify wipe.");
    }
  };

  // -----------------------------
  // Generate Certificate
  // -----------------------------
  const generateCertificate = async (assetId) => {
    try {
      const response = await fetch(
        `${API}/assets/${assetId}/certificate`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data.certificate_id) {
        setCertificate(data);
        setMessage("Certificate generated successfully!");
      } else {
        setMessage(data.message || "Certificate generation failed.");
      }
    } catch (error) {
      setMessage("Unable to generate certificate.");
    }
  };

  // -----------------------------
  // Generate QR
  // -----------------------------
  const generateQR = async (certificateId) => {
    try {
      const response = await fetch(
        `${API}/certificates/${certificateId}/qr`
      );

      const data = await response.json();

      if (data.qr_generated) {
        setQrData(data.qr_data);
        setMessage("QR verification data generated.");
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage("Unable to generate QR data.");
    }
  };

  // -----------------------------
  // Verify Certificate
  // -----------------------------
  const verifyCertificate = async (certificateId) => {
    try {
      const response = await fetch(
        `${API}/certificates/${certificateId}/verify`
      );

      const data = await response.json();

      if (data.verified) {
        setMessage("Certificate verified successfully!");
      } else {
        setMessage("Certificate verification failed.");
      }
    } catch (error) {
      setMessage("Unable to verify certificate.");
    }
  };

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div>
          <h1>SecureWipe</h1>
          <p>Secure Data Wiping & Asset Recycling Platform</p>
        </div>

        <div className="status">
          ● System Online
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {/* Dashboard Cards */}
      <section className="dashboard">
        <div className="dashboard-card">
          <h3>Total Assets</h3>
          <strong>{assets.length}</strong>
        </div>

        <div className="dashboard-card">
          <h3>Registered</h3>
          <strong>
            {assets.filter((a) => a.status === "registered").length}
          </strong>
        </div>

        <div className="dashboard-card">
          <h3>Wiped</h3>
          <strong>
            {assets.filter((a) => a.status === "wiped").length}
          </strong>
        </div>
      </section>

      {/* Register Asset */}
      <section className="card">
        <h2>Register IT Asset</h2>

        <form onSubmit={registerAsset} className="form">

          <input
            type="text"
            placeholder="Asset Tag"
            value={form.asset_tag}
            onChange={(e) =>
              setForm({
                ...form,
                asset_tag: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Device Type"
            value={form.device_type}
            onChange={(e) =>
              setForm({
                ...form,
                device_type: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Serial Number"
            value={form.serial_number}
            onChange={(e) =>
              setForm({
                ...form,
                serial_number: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Organization"
            value={form.organization}
            onChange={(e) =>
              setForm({
                ...form,
                organization: e.target.value,
              })
            }
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register Asset"}
          </button>
        </form>
      </section>

      {/* Assets */}
      <section className="card">
        <h2>Asset Management</h2>

        {assets.length === 0 ? (
          <p className="empty">
            No assets registered yet.
          </p>
        ) : (
          <div className="asset-list">

            {assets.map((asset) => (
              <div className="asset-card" key={asset.id}>

                <div className="asset-header">
                  <div>
                    <h3>{asset.asset_tag}</h3>
                    <p>{asset.device_type}</p>
                  </div>

                  <span
                    className={`badge ${
                      asset.status === "wiped"
                        ? "success"
                        : "pending"
                    }`}
                  >
                    {asset.status}
                  </span>
                </div>

                <div className="asset-info">
                  <p>
                    <b>Serial:</b> {asset.serial_number}
                  </p>

                  <p>
                    <b>Organization:</b>{" "}
                    {asset.organization}
                  </p>

                  <p>
                    <b>Policy:</b>{" "}
                    {asset.wipe_policy || "Not selected"}
                  </p>
                </div>

                {/* Policy */}
                <div className="action-row">

                  <select
                    value={
                      selectedPolicy[asset.id] ||
                      asset.wipe_policy ||
                      ""
                    }
                    onChange={(e) =>
                      setSelectedPolicy({
                        ...selectedPolicy,
                        [asset.id]: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select Wipe Policy
                    </option>

                    <option value="quick">
                      Quick
                    </option>

                    <option value="standard">
                      Standard
                    </option>

                    <option value="secure">
                      Secure
                    </option>
                  </select>

                  <button
                    onClick={() =>
                      selectPolicy(asset.id)
                    }
                  >
                    Select Policy
                  </button>

                </div>

                {/* Wipe Actions */}
                <div className="action-row">

                  <button
                    onClick={() =>
                      startWipe(asset.id)
                    }
                    disabled={asset.status === "wiped"}
                  >
                    Start Wipe
                  </button>

                  <button
                    onClick={() =>
                      verifyWipe(asset.id)
                    }
                  >
                    Verify Wipe
                  </button>

                  <button
                    onClick={() =>
                      generateCertificate(asset.id)
                    }
                    disabled={asset.status !== "wiped"}
                  >
                    Generate Certificate
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}
      </section>

      {/* Certificate */}
      {certificate && (
        <section className="card certificate">

          <h2>Digital Certificate</h2>

          <div className="certificate-box">

            <p>
              <b>Certificate ID:</b>
              <br />
              {certificate.certificate_id}
            </p>

            <p>
              <b>Asset ID:</b>
              <br />
              {certificate.asset_id}
            </p>

            <p>
              <b>Status:</b>{" "}
              {certificate.status}
            </p>

            <p>
              <b>Wipe Policy:</b>{" "}
              {certificate.wipe_policy}
            </p>

            <p>
              <b>Verified:</b>{" "}
              {certificate.verified ? "Yes" : "No"}
            </p>

            <div className="action-row">

              <button
                onClick={() =>
                  generateQR(
                    certificate.certificate_id
                  )
                }
              >
                Generate QR
              </button>

              <button
                onClick={() =>
                  verifyCertificate(
                    certificate.certificate_id
                  )
                }
              >
                Verify Certificate
              </button>

            </div>

            {qrData && (
              <div className="qr-box">
                <h3>QR Verification Data</h3>

              <div className="qr-placeholder">
                <QRCodeSVG
                  value={qrData}
                  size={180}
                />
              </div>

              <code>{qrData}</code>
            </div>
          )}

          </div>

        </section>
      )}
      {/* Audit Logs */}
<section className="card">
  <h2>Audit Logs</h2>

  {auditLogs.length === 0 ? (
    <p className="empty">No audit logs available.</p>
  ) : (
    <div className="audit-list">
      {auditLogs.map((log) => (
        <div className="audit-item" key={log.id}>
          <div>
            <strong>{log.action}</strong>
            <p>{log.details}</p>
          </div>

          <div className="audit-meta">
            <span>Asset: {log.asset_id}</span>
            <span>
              {new Date(log.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
      {/* Workflow */}
      <section className="workflow">

        <h2>SecureWipe Workflow</h2>

        <div className="workflow-steps">

          <div>1. Register Asset</div>
          <span>→</span>

          <div>2. Select Policy</div>
          <span>→</span>

          <div>3. Start Wiping</div>
          <span>→</span>

          <div>4. Verify Wipe</div>
          <span>→</span>

          <div>5. Certificate</div>
          <span>→</span>

          <div>6. QR Verification</div>

        </div>

      </section>

    </div>
  );
}

export default App;