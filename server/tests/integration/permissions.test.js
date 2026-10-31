import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";

describe("Integration: Role Permissions & Route Guards", () => {
  let employeeToken, managerToken, adminToken;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);

    await User.create([
      {
        name: "Emp User",
        email: "emp@perm.com",
        passwordHash,
        role: "employee",
        department: "Ops",
      },
      {
        name: "Mgr User",
        email: "mgr@perm.com",
        passwordHash,
        role: "manager",
        department: "Ops",
      },
      {
        name: "Adm User",
        email: "adm@perm.com",
        passwordHash,
        role: "admin",
        department: "HR",
      },
    ]);

    const getToken = async (email) => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "Password123!" });
      return res.body.token;
    };

    employeeToken = await getToken("emp@perm.com");
    managerToken = await getToken("mgr@perm.com");
    adminToken = await getToken("adm@perm.com");
  });

  it("Employee cannot access Admin routes (/api/users)", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Cookie", [`token=${employeeToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Manager cannot access Admin routes (/api/users)", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Cookie", [`token=${managerToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Admin can access Admin routes (/api/users)", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Cookie", [`token=${adminToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("Employee cannot access manager requests queue", async () => {
    const res = await request(app)
      .get("/api/manager/requests")
      .set("Cookie", [`token=${employeeToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Manager can access manager requests queue", async () => {
    const res = await request(app)
      .get("/api/manager/requests")
      .set("Cookie", [`token=${managerToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it("Admin can access reports summary and CSV export", async () => {
    const summaryRes = await request(app)
      .get("/api/reports/summary")
      .set("Cookie", [`token=${adminToken}`]);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.statusSummary).toBeDefined();

    const csvRes = await request(app)
      .get("/api/reports/export.csv")
      .set("Cookie", [`token=${adminToken}`]);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers["content-type"]).toContain("text/csv");
  });
});
