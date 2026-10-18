import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useActionData,
	useNavigation,
	useSubmit,
	redirect,
} from "react-router";
import { InvitationsService } from "@workspace/shared/services/invitations.service.js";
import { createSessionCookie } from "@workspace/shared/utils/session-cookie.js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "~/components/ui/field";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon, Loader2, ShieldCheck } from "lucide-react";

const acceptSchema = z
	.object({
		full_name: z.string().min(2, "Name is required"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type AcceptForm = z.infer<typeof acceptSchema>;

export async function loader({ params, request }: LoaderFunctionArgs) {
	const token = params.token!;
	const svc = new InvitationsService(request);
	const { data, error } = await svc.getByToken(token);

	if (error || !data) {
		return { invite: null, error: error?.message || "Invalid invitation" };
	}

	return {
		invite: {
			email: data.email,
			role: data.role,
			workspaceName: (data as any).workspace?.name || "Workspace",
			token: data.token,
		},
		error: null,
	};
}

export async function action({ request, params }: ActionFunctionArgs) {
	const token = params.token!;
	const formData = await request.formData();

	const full_name = (formData.get("full_name") as string)?.trim();
	const password = formData.get("password") as string;

	const svc = new InvitationsService(request);
	const result = await svc.acceptInvitation({ token, full_name, password });

	if (!result.success || !result.profile) {
		return { success: false, error: result.error?.message || "Failed to accept invitation" };
	}

	// Auto-login the new user
	const cookie = createSessionCookie(result.profile.id);

	return redirect("/d", {
		headers: {
			"Set-Cookie": cookie,
		},
	});
}

export default function AcceptInvitePage() {
	const { invite, error } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const submit = useSubmit();
	const [showPassword, setShowPassword] = useState(false);

	const isSubmitting = navigation.state === "submitting";

	const form = useForm<AcceptForm>({
		resolver: zodResolver(acceptSchema),
		defaultValues: { full_name: "", password: "", confirmPassword: "" },
	});

	const onSubmit = (data: AcceptForm) => {
		const fd = new FormData();
		fd.append("full_name", data.full_name);
		fd.append("password", data.password);
		submit(fd, { method: "POST" });
	};

	useEffect(() => {
		if (actionData && !actionData.success && actionData.error) {
			toast.error(actionData.error);
		}
	}, [actionData]);

	if (error || !invite) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<CardTitle>Invalid Invitation</CardTitle>
						<CardDescription>{error || "This invitation link is not valid."}</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-2">
						<ShieldCheck className="size-6" />
					</div>
					<CardTitle>Join {invite.workspaceName}</CardTitle>
					<CardDescription>
						You’ve been invited as <strong className="capitalize">{invite.role}</strong>
						<br />
						<span className="text-xs">{invite.email}</span>
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FieldSet>
							<FieldGroup>
								<Controller
									control={form.control}
									name="full_name"
									render={({ field }) => (
										<Field data-invalid={!!form.formState.errors.full_name}>
											<FieldLabel htmlFor="full_name">Full name</FieldLabel>
											<Input id="full_name" placeholder="Your name" {...field} />
											{form.formState.errors.full_name && (
												<FieldError>
													{form.formState.errors.full_name.message}
												</FieldError>
											)}
										</Field>
									)}
								/>

								<Controller
									control={form.control}
									name="password"
									render={({ field }) => (
										<Field data-invalid={!!form.formState.errors.password}>
											<FieldLabel htmlFor="password">Password</FieldLabel>
											<div className="relative">
												<Input
													id="password"
													type={showPassword ? "text" : "password"}
													placeholder="Create a password"
													className="pr-10"
													{...field}
												/>
												<button
													type="button"
													className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
													onClick={() => setShowPassword(!showPassword)}
												>
													{showPassword ? (
														<EyeOffIcon className="size-4" />
													) : (
														<EyeIcon className="size-4" />
													)}
												</button>
											</div>
											{form.formState.errors.password && (
												<FieldError>
													{form.formState.errors.password.message}
												</FieldError>
											)}
										</Field>
									)}
								/>

								<Controller
									control={form.control}
									name="confirmPassword"
									render={({ field }) => (
										<Field data-invalid={!!form.formState.errors.confirmPassword}>
											<FieldLabel htmlFor="confirmPassword">
												Confirm password
											</FieldLabel>
											<Input
												id="confirmPassword"
												type="password"
												placeholder="Confirm password"
												{...field}
											/>
											{form.formState.errors.confirmPassword && (
												<FieldError>
													{form.formState.errors.confirmPassword.message}
												</FieldError>
											)}
										</Field>
									)}
								/>
							</FieldGroup>
						</FieldSet>

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
							Accept & Join Workspace
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
