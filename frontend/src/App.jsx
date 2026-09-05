import { useEffect, useState } from "react";
import "./App.css";
import { QRCodeSVG } from "qrcode.react";

const API = "http://127.0.0.1:8000";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [assets, setAssets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
  _assets: 0,
  wiped: 0,
  certificates: 0,
  verification_rate: 0,
  });

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

  // -----------------------------
  // Login
  // -----------------------------
  const loginUser = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();
      if (data.logged_in) {
        setToken(data.access_token);
        localStorage.setItem("securewipe_token", data.access_token);

        setIsLoggedIn(true);
        setMessage("Login successful!");
      }
      else {
        setMessage(data.message || "Invalid username or password.");
      }
    } catch (error) {
      setMessage("Unable to connect to backend.");
    }
  };

  // -----------------------------
  // Get Assetstotal
  // -----------------------------
  const fetchAssets = async () => {
    try {
       const response = await fetch(`${API}/assets`, {
        headers: {
        Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      setMessage("Backend server is not running.");
    }
  };

  // -----------------------------
  // Get Audit Logs
  // -----------------------------
  const fetchAuditLogs = async () => {
    try {
      const response = await fetch(`${API}/audit-logs`, {
        headers: {
        Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error("Unable to fetch audit logs.");
    }
  };
  const fetchDashboard = async () => {
  try {
    const response = await fetch(`${API}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      setDashboardStats(data);
    }
  } catch (error) {
    console.error("Unable to fetch dashboard statistics.");
    }
  };
  useEffect(() => {
  if (isLoggedIn && token) {
    fetchAssets();
    fetchAuditLogs();
    fetchDashboard();
  }
}, [isLoggedIn, token]);
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
          Authorization: `Bearer ${token}`,

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

        await fetchAssets();
        await fetchAuditLogs();

        setActiveSection("assets");
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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            policy,
          }),
        }
      );

      const data = await response.json();

      setMessage(data.message);

      await fetchAssets();
      await fetchAuditLogs();
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      setMessage(data.message);

      await fetchAssets();
      await fetchAuditLogs();
    } catch (error) {
      setMessage("Unable to start wiping.");
    }
  };

  // -----------------------------
  // Verify Wipe
  // -----------------------------
  const verifyWipe = async (assetId) => {
    try {
      const response = await fetch(`${API}/assets/${assetId}/verify`, {
        headers: {
        Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.verified) {
        setMessage("Wipe verified successfully!");
      } else {
        setMessage("Wipe verification failed.");
      }

      await fetchAuditLogs();
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
          headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.certificate_id) {
        setCertificate(data);
        setMessage("Certificate generated successfully!");
        await fetchAuditLogs();
        setActiveSection("certificate");
      } else {
        setMessage(
          data.message || "Certificate generation failed."
        );
      }
    } catch (error) {
      setMessage("Unable to generate certificate.");
    }
  };
  // -----------------------------
// Download Certificate
// -----------------------------
const downloadCertificate = async (certificateId) => {
  try {
    const response = await fetch(
      `${API}/certificates/${certificateId}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      setMessage("Unable to download certificate.");
      return;
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `SecureWipe-${certificateId}.pdf`;

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);

    setMessage("Certificate downloaded successfully!");
  } catch (error) {
    setMessage("Unable to download certificate.");
  }
  };
  // -----------------------------
  // Generate QR
  // -----------------------------
  const generateQR = async (certificateId) => {
    try {
      const response = await fetch(`${API}/certificates/${certificateId}/qr`, {
        headers: {
        Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.qr_generated) {
        setQrData(data.qr_data);
        setMessage("QR verification data generated!");
      } else {
        setMessage(data.message || "Unable to generate QR.");
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
      const response = await fetch(`${API}/certificates/${certificateId}/verify`, {
        headers: {
        Authorization: `Bearer ${token}`,
        },
      });

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

  // -----------------------------
  // Logout
  // -----------------------------
  const logout = () => {
  setIsLoggedIn(false);
  setToken("");
  localStorage.removeItem("securewipe_token");
  setUsername("");
  setPassword("");
  setMessage("");
  };

  // -----------------------------
  // Navigation
  // -----------------------------
  const navigate = (section) => {
    setActiveSection(section);
    setMessage("");
  };

  // -----------------------------
  // Dashboard Values
  // -----------------------------
  const totalAssets = assets.length;

  const registeredAssets = assets.filter(
    (asset) => asset.status === "registered"
  ).length;

  const wipedAssets = assets.filter(
    (asset) => asset.status === "wiped"
  ).length;

  const selectedPolicies = assets.filter(
    (asset) => asset.wipe_policy
  ).length;

  // -----------------------------
  // Login Screen
  // -----------------------------
  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-glow"></div>

        <div className="login-card">
          <div className="login-logo">
            <div className="shield-icon">✓</div>
            <div>
              <h1>SecureWipe</h1>
              <p>Secure Data Sanitization Platform</p>
            </div>
          </div>

          <div className="login-heading">
            <span>SECURE ACCESS</span>
            <h2>Welcome back</h2>
            <p>
              Sign in to manage IT assets and secure data wiping
              operations.
            </p>
          </div>

          <form onSubmit={loginUser} className="login-form">
            <label>Username</label>

            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" className="primary-button">
              Sign In →
            </button>
          </form>

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}

          <div className="login-footer">
            <span>●</span> SecureWipe API Protected
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">✓</div>

          <div>
            <h1>SecureWipe</h1>
            <span>IT ASSET SECURITY</span>
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          <div>
            <strong>System Online</strong>
            <small>All services operational</small>
          </div>
        </div>

        <nav className="sidebar-nav">

          <p className="nav-title">MAIN MENU</p>

          <button
            className={
              activeSection === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => navigate("dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            className={
              activeSection === "assets"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => navigate("assets")}
          >
            <span>▣</span>
            Asset Management
          </button>

          <button
            className={
              activeSection === "wipe"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => navigate("wipe")}
          >
            <span>◈</span>
            Wipe Operations
          </button>

          <p className="nav-title">SECURITY</p>

          <button
            className={
              activeSection === "certificate"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => navigate("certificate")}
          >
            <span>▤</span>
            Certificates
          </button>

          <button
            className={
              activeSection === "audit"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => navigate("audit")}
          >
            <span>☷</span>
            Audit Logs
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="security-box">
            <div className="security-icon">◆</div>

            <div>
              <strong>Security Mode</strong>
              <small>Controlled wipe simulation</small>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            ⇥ &nbsp; Sign Out
          </button>

        </div>
      </aside>

      {/* Main */}
      <main className="main-content">

        {/* Topbar */}
        <header className="topbar">

          <div>
            <span className="breadcrumb">
              SECUREWIPE / {activeSection.toUpperCase()}
            </span>

            <h2>
              {activeSection === "dashboard" &&
                "Security Dashboard"}

              {activeSection === "assets" &&
                "Asset Management"}

              {activeSection === "wipe" &&
                "Wipe Operations"}

              {activeSection === "certificate" &&
                "Digital Certificates"}

              {activeSection === "audit" &&
                "Audit Logs"}
            </h2>
          </div>

          <div className="topbar-user">
            <div className="user-avatar">
              {username.charAt(0).toUpperCase() || "U"}
            </div>

            <div>
              <strong>{username || "Administrator"}</strong>
              <small>Authorized User</small>
            </div>
          </div>

        </header>

        {/* Message */}
        {message && (
          <div className="message">
            <span>✓</span>
            {message}
            <button
              className="message-close"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        {/* ============================= */}
        {/* DASHBOARD */}
        {/* ============================= */}

        {activeSection === "dashboard" && (
          <>
            <section className="hero-section">

              <div>
                <span className="eyebrow">
                  ASSET SECURITY CENTER
                </span>

                <h1>
                  Secure your data.
                  <br />
                  <span>Recycle with confidence.</span>
                </h1>

                <p>
                  Manage IT assets, securely wipe data, verify
                  sanitization, and generate trusted digital
                  certificates.
                </p>

                <button
                  className="primary-button"
                  onClick={() => navigate("assets")}
                >
                  Manage Assets →
                </button>
              </div>

              <div className="hero-shield">
                <div className="shield-large">✓</div>
                <span>PROTECTED</span>
              </div>

            </section>

            <section className="stats-grid">
              <div
                className="stat-card clickable-card"
                onClick={() => setActiveSection("assets")}
              >
                <div className="stat-icon blue">▣</div>
                <div>
                  <span>Total Assets</span>
                  <strong>{dashboardStats.total_assets}</strong>
                  <small>Registered in system</small>
                </div>
              </div>

              <div
                className="stat-card clickable-card"
                onClick={() => setActiveSection("wipe")}
              >
                <div className="stat-icon orange">◷</div>
                <div>
                  <span>Pending</span>
                  <strong>
                  {dashboardStats.total_assets - dashboardStats.wiped}
                  </strong>
                  <small>Awaiting secure wipe</small>
                </div>
              </div>

              <div
                className="stat-card clickable-card"
                onClick={() => setActiveSection("wipe")}
              >
                <div className="stat-icon green">✓</div>
                <div>
                  <span>Wiped Assets</span>
                  <strong>{dashboardStats.wiped}</strong>
                  <small>Successfully sanitized</small>
                </div>
              </div>

              <div
                className="stat-card clickable-card"
                onClick={() => setActiveSection("certificate")}
              >
                <div className="stat-icon purple">◇</div>
                <div>
                  <span>Certificates</span>
                  <strong>{dashboardStats.certificates}</strong>
                  <small>Certificates generated</small>
                </div>
              </div>

              <div
                className="stat-card clickable-card"
                onClick={() => setActiveSection("certificate")}
              >
                <div className="stat-icon green">✓</div>
                <div>
                  <span>Verification Rate</span>
                  <strong>{dashboardStats.verification_rate}%</strong>
                  <small>Assets successfully verified</small>
                </div>
              </div>
            </section>

            <section className="dashboard-grid">

              <div className="panel workflow-panel">

                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      PROCESS
                    </span>
                    <h3>SecureWipe Workflow</h3>
                  </div>
                </div>

                <div className="workflow-modern">

                  <div className="workflow-step">
                    <div>01</div>
                    <span>Register Asset</span>
                  </div>

                  <div className="workflow-line"></div>

                  <div className="workflow-step">
                    <div>02</div>
                    <span>Select Policy</span>
                  </div>

                  <div className="workflow-line"></div>

                  <div className="workflow-step">
                    <div>03</div>
                    <span>Start Wipe</span>
                  </div>

                  <div className="workflow-line"></div>

                  <div className="workflow-step">
                    <div>04</div>
                    <span>Verify</span>
                  </div>

                  <div className="workflow-line"></div>

                  <div className="workflow-step">
                    <div>05</div>
                    <span>Certificate</span>
                  </div>

                </div>

              </div>

              <div className="panel quick-panel">

                <span className="eyebrow">
                  QUICK ACTION
                </span>

                <h3>Start a new asset</h3>

                <p>
                  Register a device and begin the secure
                  sanitization workflow.
                </p>

                <button
                  className="secondary-button"
                  onClick={() => navigate("assets")}
                >
                  + Register Asset
                </button>

              </div>

            </section>
          </>
        )}

        {/* ============================= */}
        {/* ASSETS */}
        {/* ============================= */}

        {activeSection === "assets" && (
          <>
            <section className="section-intro">
              <div>
                <span className="eyebrow">
                  INVENTORY CONTROL
                </span>
                <h1>Asset Management</h1>
                <p>
                  Register and manage devices before secure
                  data sanitization.
                </p>
              </div>

              <div className="section-count">
                <strong>{totalAssets}</strong>
                <span>Total Assets</span>
              </div>
            </section>

            <section className="panel register-panel">

              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    NEW ASSET
                  </span>
                  <h3>Register IT Asset</h3>
                </div>
              </div>

              <form
                onSubmit={registerAsset}
                className="modern-form"
              >

                <div className="input-group">
                  <label>Asset Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. ASSET-002"
                    value={form.asset_tag}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        asset_tag: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Device Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Laptop"
                    value={form.device_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        device_type: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Serial Number</label>
                  <input
                    type="text"
                    placeholder="Enter serial number"
                    value={form.serial_number}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        serial_number: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    placeholder="Enter organization"
                    value={form.organization}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        organization: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="primary-button form-submit"
                  disabled={loading}
                >
                  {loading
                    ? "Registering..."
                    : "Register Asset →"}
                </button>

              </form>
            </section>

            <section className="panel">

              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    INVENTORY
                  </span>
                  <h3>Registered Assets</h3>
                </div>
              </div>

              {assets.length === 0 ? (
                <div className="empty-state">
                  <div>▣</div>
                  <h3>No assets registered</h3>
                  <p>
                    Register your first IT asset above.
                  </p>
                </div>
              ) : (
                <div className="asset-grid">

                  {assets.map((asset) => (
                    <div
                      className="modern-asset-card"
                      key={asset.id}
                    >

                      <div className="asset-card-top">

                        <div className="device-icon">
                          ▣
                        </div>

                        <span
                          className={`status-badge ${
                            asset.status === "wiped"
                              ? "status-success"
                              : "status-pending"
                          }`}
                        >
                          {asset.status}
                        </span>

                      </div>

                      <h3>{asset.asset_tag}</h3>

                      <p className="device-type">
                        {asset.device_type}
                      </p>

                      <div className="asset-details">

                        <div>
                          <span>Serial Number</span>
                          <strong>
                            {asset.serial_number}
                          </strong>
                        </div>

                        <div>
                          <span>Organization</span>
                          <strong>
                            {asset.organization || "—"}
                          </strong>
                        </div>

                        <div>
                          <span>Wipe Policy</span>
                          <strong>
                            {asset.wipe_policy ||
                              "Not selected"}
                          </strong>
                        </div>

                      </div>

                      <div className="policy-section">

                        <label>Choose Wipe Policy</label>

                        <select
                          value={
                            selectedPolicy[asset.id] ||
                            asset.wipe_policy ||
                            ""
                          }
                          onChange={(e) =>
                            setSelectedPolicy({
                              ...selectedPolicy,
                              [asset.id]:
                                e.target.value,
                            })
                          }
                        >
                          <option value="">
                            Select policy
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
                          className="secondary-button full-button"
                          onClick={() =>
                            selectPolicy(asset.id)
                          }
                        >
                          Apply Policy
                        </button>

                      </div>

                      <div className="asset-actions">

                        <button
                          className="primary-button"
                          onClick={() =>
                            startWipe(asset.id)
                          }
                          disabled={
                            asset.status === "wiped"
                          }
                        >
                          {asset.status === "wiped"
                            ? "✓ Wiped"
                            : "Start Wipe"}
                        </button>

                        <button
                          className="outline-button"
                          onClick={() =>
                            verifyWipe(asset.id)
                          }
                        >
                          Verify
                        </button>

                        <button
                          className="outline-button"
                          onClick={() =>
                            generateCertificate(
                              asset.id
                            )
                          }
                          disabled={
                            asset.status !== "wiped"
                          }
                        >
                          Certificate
                        </button>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </section>
          </>
        )}

        {/* ============================= */}
        {/* WIPE OPERATIONS */}
        {/* ============================= */}

        {activeSection === "wipe" && (
          <>
            <section className="section-intro">
              <div>
                <span className="eyebrow">
                  SANITIZATION CENTER
                </span>

                <h1>Wipe Operations</h1>

                <p>
                  Select a policy, start the controlled wipe
                  simulation, and verify the result.
                </p>
              </div>
            </section>

            <section className="wipe-warning">
              <div className="warning-icon">!</div>

              <div>
                <strong>Controlled Simulation Mode</strong>

                <p>
                  SecureWipe currently demonstrates the
                  sanitization workflow without performing
                  destructive operations on real disks.
                </p>
              </div>
            </section>

            <section className="wipe-grid">

              <div className="wipe-info-card">
                <div className="wipe-number">01</div>
                <h3>Quick</h3>
                <p>
                  Fast sanitization workflow for demonstration
                  and testing.
                </p>
              </div>

              <div className="wipe-info-card">
                <div className="wipe-number">02</div>
                <h3>Standard</h3>
                <p>
                  Balanced policy for a normal secure wipe
                  workflow.
                </p>
              </div>

              <div className="wipe-info-card featured">
                <div className="wipe-number">03</div>
                <h3>Secure</h3>
                <p>
                  Enhanced sanitization policy for sensitive
                  asset handling.
                </p>
              </div>

            </section>

            <section className="panel">

              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    OPERATIONS
                  </span>
                  <h3>Assets Ready for Wiping</h3>
                </div>
              </div>

              <div className="operation-list">

                {assets.length === 0 ? (
                  <p className="empty-state-text">
                    No assets available.
                  </p>
                ) : (
                  assets.map((asset) => (
                    <div
                      className="operation-row"
                      key={asset.id}
                    >

                      <div className="operation-device">
                        <div className="device-icon">
                          ▣
                        </div>

                        <div>
                          <strong>
                            {asset.asset_tag}
                          </strong>

                          <span>
                            {asset.device_type} •{" "}
                            {asset.serial_number}
                          </span>
                        </div>
                      </div>

                      <div className="operation-policy">
                        <span>Policy</span>
                        <strong>
                          {asset.wipe_policy ||
                            "Not selected"}
                        </strong>
                      </div>

                      <div>
                        <span
                          className={`status-badge ${
                            asset.status === "wiped"
                              ? "status-success"
                              : "status-pending"
                          }`}
                        >
                          {asset.status}
                        </span>
                      </div>

                      <button
                        className="primary-button"
                        onClick={() =>
                          startWipe(asset.id)
                        }
                        disabled={
                          asset.status === "wiped"
                        }
                      >
                        {asset.status === "wiped"
                          ? "Completed"
                          : "Start Wipe"}
                      </button>

                    </div>
                  ))
                )}

              </div>

            </section>
          </>
        )}

        {/* ============================= */}
        {/* CERTIFICATE */}
        {/* ============================= */}

        {activeSection === "certificate" && (
          <>
            <section className="section-intro">
              <div>
                <span className="eyebrow">
                  TRUSTED DOCUMENTATION
                </span>

                <h1>Digital Certificate</h1>

                <p>
                  Verify and share proof of successful data
                  sanitization.
                </p>
              </div>
            </section>

            {!certificate ? (
              <section className="empty-state panel">
                <div>▤</div>
                <h3>No certificate selected</h3>
                <p>
                  Complete a wipe operation and generate a
                  certificate from Asset Management.
                </p>

                <button
                  className="primary-button"
                  onClick={() => navigate("assets")}
                >
                  Go to Assets →
                </button>
              </section>
            ) : (
              <section className="certificate-layout">

                <div className="certificate-modern">

                  <div className="certificate-header">
                    <div className="certificate-logo">
                      ✓
                    </div>

                    <div>
                      <span>
                        SECUREWIPE VERIFIED
                      </span>

                      <h2>
                        Data Sanitization Certificate
                      </h2>
                    </div>
                  </div>

                  <div className="certificate-status">
                    <span>✓</span>
                    VERIFIED
                  </div>

                  <div className="certificate-details">

                    <div>
                      <span>Certificate ID</span>
                      <strong>
                        {certificate.certificate_id}
                      </strong>
                    </div>

                    <div>
                      <span>Asset ID</span>
                      <strong>
                        {certificate.asset_id}
                      </strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong>
                        {certificate.status}
                      </strong>
                    </div>

                    <div>
                      <span>Wipe Policy</span>
                      <strong>
                        {certificate.wipe_policy}
                      </strong>
                    </div>

                    <div>
                      <span>Verification</span>
                      <strong>
                        {certificate.verified
                          ? "Verified"
                          : "Not Verified"}
                      </strong>
                    </div>

                  </div>

                  <div className="certificate-footer">
                    <span>
                      Issued by SecureWipe Platform
                    </span>

                    <span>
                      Digital verification enabled
                    </span>
                  </div>

                </div>

                <div className="certificate-side">

                  <div className="panel qr-panel">

                    <span className="eyebrow">
                      VERIFICATION
                    </span>

                    <h3>QR Code</h3>

                    <p>
                      Generate a QR payload for quick
                      certificate verification.
                    </p>

                    <button
                      className="primary-button full-button"
                      onClick={() =>
                        generateQR(
                          certificate.certificate_id
                        )
                      }
                    >
                      Generate QR Code
                    </button>

                    {qrData && (
                      <div className="qr-result">

                        <QRCodeSVG
                          value={qrData}
                          size={180}
                        />

                        <code>{qrData}</code>

                      </div>
                    )}

                  </div>

                  <div className="panel verify-panel">

                    <span className="eyebrow">
                      CERTIFICATE CHECK
                    </span>

                    <h3>Verify Certificate</h3>

                    <p>
                      Confirm that this certificate exists
                      in the SecureWipe database.
                    </p>

                    <button
                      className="primary-button full-button"
                      onClick={() =>
                        downloadCertificate(
                          certificate.certificate_id
                        )
                      }
                    >
                    ↓ Download Certificate
                    </button>

                    <button
                      className="outline-button full-button"
                      onClick={() =>
                        verifyCertificate(
                          certificate.certificate_id
                        )
                      }
                    >
                      ✓ Verify Certificate
                    </button>

                  </div>

                </div>

              </section>
            )}
          </>
        )}

        {/* ============================= */}
        {/* AUDIT LOGS */}
        {/* ============================= */}

        {activeSection === "audit" && (
          <>
            <section className="section-intro">
              <div>
                <span className="eyebrow">
                  SECURITY RECORD
                </span>

                <h1>Audit Logs</h1>

                <p>
                  Complete activity history recorded by the
                  SecureWipe platform.
                </p>
              </div>

              <div className="section-count">
                <strong>{auditLogs.length}</strong>
                <span>Events</span>
              </div>
            </section>

            <section className="panel audit-panel">

              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    ACTIVITY HISTORY
                  </span>

                  <h3>System Events</h3>
                </div>

                <button
                  className="outline-button"
                  onClick={fetchAuditLogs}
                >
                  ↻ Refresh
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="empty-state">
                  <div>☷</div>
                  <h3>No audit logs</h3>
                  <p>
                    System activity will appear here.
                  </p>
                </div>
              ) : (
                <div className="audit-table">

                  <div className="audit-header">
                    <span>EVENT</span>
                    <span>USER</span>
                    <span>ASSET</span>
                    <span>DETAILS</span>
                    <span>TIME</span>
                  </div>

                  {auditLogs.map((log) => (
                    <div
                      className="audit-row"
                      key={log.id}
                    >

                      <div className="audit-event">
                        <span>✓</span>
                        <strong>{log.action}</strong>
                      </div>

                        <span>
                          {log.username || "System"}
                          </span>

                        <span>
  {log.asset_id || "System"}
                        </span>

                        <span>
                          {log.details || "—"}
                        </span>

                        <span>
                          {new Date(
                            log.timestamp
                          ).toLocaleString()}
                        </span>

                    </div>
                  ))}

                </div>
              )}

            </section>
          </>
        )}

      </main>
    </div>
  );
}

export default App;