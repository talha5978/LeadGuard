import { parse, serialize } from "cookie";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "leadguard_session";
const SECRET = process.env.SESSION_SECRET || "leadguard-super-secret-change-me-in-production";

function sign(value: string): string {
	const signature = createHmac("sha256", SECRET).update(value).digest("base64url");
	return `${value}.${signature}`;
}

function unsign(signedValue: string): string | null {
	const [value, signature] = signedValue.split(".");
	if (!value || !signature) return null;

	const expected = createHmac("sha256", SECRET).update(value).digest("base64url");

	try {
		const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
		return valid ? value : null;
	} catch {
		return null;
	}
}

export function createSessionCookie(userId: string): string {
	const signed = sign(userId);

	return serialize(COOKIE_NAME, signed, {
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 7, // 7 days
	});
}

export function destroySessionCookie(): string {
	return serialize(COOKIE_NAME, "", {
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: 0,
	});
}

export function getUserIdFromRequest(request: Request): string | null {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) return null;

	const cookies = parse(cookieHeader);
	const signed = cookies[COOKIE_NAME];

	if (!signed) return null;

	return unsign(signed);
}
