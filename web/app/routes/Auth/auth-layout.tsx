import { Outlet, useNavigate, useRouteLoaderData } from "react-router";
import type { loader } from "~/root";

export default function AppLayout() {
	const d = useRouteLoaderData<typeof loader>("root");
	const navigate = useNavigate();
	if (!d?.user) {
		navigate("/", { replace: true });
	}

	return (
		<div className="min-h-screen bg-background">
			<main>
				<Outlet />
			</main>
		</div>
	);
}
