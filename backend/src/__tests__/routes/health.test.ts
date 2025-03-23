import request from "supertest";
import app from "../../server";

describe("Health Check API", () => {
  it("should return 200 and status ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

