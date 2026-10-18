import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	layout("./routes/Auth/auth-layout.tsx", [
		route("signup", "routes/Auth/signup.tsx"),
		route("login", "routes/Auth/login.tsx"),
	]),
] satisfies RouteConfig;
