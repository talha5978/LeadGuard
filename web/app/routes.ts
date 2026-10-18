import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("signup", "routes/Auth/signup.tsx"),
	route("login", "routes/Auth/login.tsx"),
	route("logout", "./routes/Auth/logout.ts"),

	layout("./routes/Auth/auth-layout.tsx", [route("d", "routes/Dashboard/dashboard.tsx")]),
] satisfies RouteConfig;
