import { Outlet, redirect, type LoaderFunctionArgs } from "react-router";
import { getCurrentUser } from "@workspace/shared/queries/auth.q.js";

export async function loader({ request }: LoaderFunctionArgs) {
	const headers = new Headers(request.headers);

	const {
		data: { user, error },
	} = await getCurrentUser(request, headers);

	// Not logged in → send to login
	if (!user || error) {
		return redirect("/login");
	}

	// Pass the user to all child routes
	return { user };
}

export default function AppLayout() {
	return (
		<div className="min-h-screen bg-background">
			<main>
				<Outlet />
			</main>
		</div>
	);
}
