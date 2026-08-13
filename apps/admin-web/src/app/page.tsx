export default function AdminHome() {
  const modules = ["Users","Trips","Bookings","Partners","Agencies","Drivers","Payments","Refunds","Settlements","Commission Rules","Incidents","Support","Content","THOTH Tools","Feature Flags","Queues","Audit","Analytics"];
  return (<main style={{ padding: 24, fontFamily: "system-ui" }}><h1>KEMRAA Admin</h1><p>Database-first build. API + CRUD in Phase 2; full pages in Phase 3.</p><ul>{modules.map((m)=><li key={m}>{m}</li>)}</ul></main>);
}