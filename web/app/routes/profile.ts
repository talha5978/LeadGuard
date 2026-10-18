import { type ActionFunctionArgs, redirect } from "react-router";
import { AuthService } from "@workspace/shared/services/auth.service.js";

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "update_status") {
		const status = formData.get("status") as "available" | "busy" | "on_leave" | "offline";

		const allowed = ["available", "busy", "on_leave", "offline"];
		if (!allowed.includes(status)) {
			return { success: false, error: "Invalid status" };
		}

		const auth = new AuthService(request);
		const result = await auth.updateProfile({ status });

		if (result.error) {
			return { success: false, error: result.error.message };
		}

		return { success: true, status };
	}

	return { success: false, error: "Unknown action" };
}

// Prevent opening /d/profile as a page
export async function loader() {
	return redirect("/d");
}
