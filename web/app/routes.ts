import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("signup", "routes/Auth/signup.tsx"),
	route("login", "routes/Auth/login.tsx"),
	route("logout", "./routes/Auth/logout.ts"),

	route("invite/:token", "./routes/Invite/invite.$token.tsx"),

	layout("./routes/Auth/auth-layout.tsx", [
		route("d", "routes/Dashboard/dashboard.tsx", [
			route("opportunities", "routes/Opportunities/opportunities.tsx"),

			route("contacts", "./routes/Contacts/contacts.tsx"),

			route("team", "./routes/Invite/team.tsx"),

			route("recovery", "./routes/Recovery/recovery.tsx"),

			route("profile", "./routes/profile.ts"),
		]),
	]),
] satisfies RouteConfig;
