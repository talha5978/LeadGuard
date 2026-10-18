import { type ActionFunctionArgs, redirect } from "react-router";
import { AuthService } from "@workspace/shared/services/auth.service.js";

export async function action({ request }: ActionFunctionArgs) {
	const authSvc = new AuthService(request);

	const { headers } = await authSvc.logout();

	return redirect("/login", {
		headers: {
			"Set-Cookie": headers.get("Set-Cookie") || "",
		},
	});
}
export const loader = () => {
	return null;
};
