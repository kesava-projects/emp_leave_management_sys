import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";

describe("Integration: Auth Endpoints", () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await User.create({
      name: "John Employee",
      email: "john@company.com",
      passwordHash,
      role: "employee",
      department: "Engineering",
      isActive: true,
    });
  });

  it("POST /api/auth/login logs in user and sets httpOnly cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "john@company.com", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("john@company.com");
    expect(res.body.user.role).toBe("employee");
    expect(res.body.token).toBeDefined();

    // Check Set-Cookie header
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes("token="))).toBe(true);
    expect(cookies.some((c) => c.includes("HttpOnly"))).toBe(true);
  });

  it("POST /api/auth/login rejects incorrect password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "john@company.com", password: "WrongPassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("POST /api/auth/login rejects non-existent email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@company.com", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("GET /api/auth/me returns current user when authenticated with cookie", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john@company.com", password: "Password123!" });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`token=${token}`]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.name).toBe("John Employee");
  });

  it("GET /api/auth/me returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/auth/logout clears cookie", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john@company.com", password: "Password123!" });

    const token = loginRes.body.token;

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [`token=${token}`]);

    expect(logoutRes.status).toBe(200);
    const cookies = logoutRes.headers["set-cookie"];
    expect(cookies.some((c) => c.includes("token=;"))).toBe(true);
  });
});
