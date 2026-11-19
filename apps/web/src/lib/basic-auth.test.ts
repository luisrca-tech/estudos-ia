import { describe, expect, it } from "vitest";

import { isAuthorized } from "./basic-auth";

const basic = (credentials: string) => `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;

describe("isAuthorized", () => {
  it("lets every request through when no password is configured", () => {
    expect(isAuthorized(null, "luis", undefined)).toBe(true);
    expect(isAuthorized(null, "luis", "")).toBe(true);
    expect(isAuthorized("Basic garbage", "luis", "")).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(isAuthorized(null, "luis", "test123")).toBe(false);
    expect(isAuthorized(undefined, "luis", "test123")).toBe(false);
    expect(isAuthorized("", "luis", "test123")).toBe(false);
  });

  it("rejects other schemes", () => {
    expect(isAuthorized(`Bearer ${Buffer.from("luis:test123").toString("base64")}`, "luis", "test123")).toBe(false);
    expect(isAuthorized(Buffer.from("luis:test123").toString("base64"), "luis", "test123")).toBe(false);
  });

  it("rejects malformed base64 and credentials without a colon", () => {
    expect(isAuthorized("Basic %%%not-base64%%%", "luis", "test123")).toBe(false);
    expect(isAuthorized("Basic ", "luis", "test123")).toBe(false);
    expect(isAuthorized(basic("luistest123"), "luis", "test123")).toBe(false);
  });

  it("rejects a wrong user or a wrong password", () => {
    expect(isAuthorized(basic("ana:test123"), "luis", "test123")).toBe(false);
    expect(isAuthorized(basic("luis:test124"), "luis", "test123")).toBe(false);
    expect(isAuthorized(basic("luis:test1234"), "luis", "test123")).toBe(false);
    expect(isAuthorized(basic("luis:"), "luis", "test123")).toBe(false);
  });

  it("accepts the right credentials, with any case of the scheme", () => {
    expect(isAuthorized(basic("luis:test123"), "luis", "test123")).toBe(true);
    expect(isAuthorized(basic("luis:test123").replace("Basic", "basic"), "luis", "test123")).toBe(true);
  });

  it("splits on the first colon, so the password may contain colons", () => {
    expect(isAuthorized(basic("luis:a:b:c"), "luis", "a:b:c")).toBe(true);
    expect(isAuthorized(basic("luis:a:b"), "luis", "a:b:c")).toBe(false);
  });

  it("decodes UTF-8 user and password", () => {
    expect(isAuthorized(basic("joão:senha-ção-🔒"), "joão", "senha-ção-🔒")).toBe(true);
    expect(isAuthorized(basic("joao:senha-ção-🔒"), "joão", "senha-ção-🔒")).toBe(false);
  });
});
