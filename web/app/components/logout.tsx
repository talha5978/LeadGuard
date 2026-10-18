import { Button } from "~/components/ui/button";
import { Form, useActionData, useNavigation } from "react-router";
import { Loader2, LogOutIcon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const LogoutButton = () => {
	const navigation = useNavigation();
	const actionData = useActionData();

	const isLoggingOut =
		navigation.state === "submitting" &&
		navigation.formAction?.endsWith("/logout") &&
		navigation.formMethod === "POST";

	useEffect(() => {
		if (actionData?.error) {
			toast.error(actionData.error);
		}

		if (actionData?.success) {
			toast.success("Logged out successfully");
		}
	}, [actionData]);

	return (
		<Form action="/logout" method="POST">
			<Button
				variant="outline"
				disabled={isLoggingOut}
				className="min-w-full"
				size={"sm"}
				type="submit"
			>
				{isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOutIcon />}
				<span>Logout</span>
			</Button>
		</Form>
	);
};
