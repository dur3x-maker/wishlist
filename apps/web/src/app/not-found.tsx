export default function NotFound() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "0.5rem" }}>404</h1>
        <p style={{ color: "#666" }}>Page not found</p>
        <a href="/" style={{ color: "#7c3aed", marginTop: "1rem", display: "inline-block" }}>Go home</a>
      </div>
    </div>
  );
}
