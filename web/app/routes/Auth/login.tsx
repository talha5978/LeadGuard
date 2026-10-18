import { EyeIcon, EyeOffIcon, Loader2, LockIcon, MailIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "~/components/ui/field";
import {
	type ActionFunctionArgs,
	Link,
	type LoaderFunctionArgs,
	redirect,
	useActionData,
	useNavigate,
	useNavigation,
	useSubmit,
} from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AuthService } from "@workspace/shared/services/auth.service.js";
import { loginSchema } from "@workspace/shared/schemas/login.schema.js";
import { ApiError } from "@workspace/shared/utils/ApiError.js";
import type { ActionResponse } from "@workspace/shared/types/action-data.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export async function action({ request }: ActionFunctionArgs) {
	try {
		const formData = await request.formData();
		const email = (formData.get("email") as string)?.trim();
		const password = (formData.get("password") as string)?.trim();

		if (!email || !password) {
			return { error: "Email and password are required", success: false };
		}

		const parseResult = loginSchema.safeParse({ email, password });
		if (!parseResult.success) {
			const firstError = Object.values(parseResult.error.flatten().fieldErrors).flat()[0]!;
			return { error: firstError, success: false };
		}

		const authSvc = new AuthService(request);
		const { error, session, headers } = await authSvc.loginWithPassword({
			email,
			password,
		});

		if (error || !session) {
			return { error: error?.message || "Invalid email or password", success: false };
		}

		// Return success + set the session cookie
		return new Response(JSON.stringify({ success: true, error: null }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Set-Cookie": headers.get("Set-Cookie") || "",
			},
		});
	} catch (error: any) {
		const errorMessage = error instanceof ApiError ? error.message : error.message || "Failed to login";
		return { success: false, error: errorMessage };
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	const authSvc = new AuthService(request);
	const { user } = await authSvc.getCurrentUser();

	// Already logged in → go to app
	if (user?.id) {
		console.log(user);
		return redirect("/d");
	}

	return { user: null };
}

export const meta = () => {
	return [{ title: "Login | LeadGuard" }];
};

export default function LoginPage() {
	const actionData: ActionResponse | undefined = useActionData();
	const navigation = useNavigation();
	const navigate = useNavigate();
	const submit = useSubmit();

	const isSubmitting = navigation.state === "submitting" && navigation.formMethod === "POST";
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm<{ email: string; password: string }>({
		resolver: zodResolver(loginSchema), // create this schema (see below)
		mode: "onChange",
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = form;

	const onFormSubmit = (data: { email: string; password: string }) => {
		const formData = new FormData();
		formData.append("email", data.email.trim());
		formData.append("password", data.password.trim());
		submit(formData, { method: "POST", action: "/login" });
	};

	useEffect(() => {
		if (actionData) {
			if (actionData.success) {
				toast.success("Logged in successfully");
				navigate("/d", { replace: true });
			} else if (actionData.error) {
				toast.error(actionData.error, { description: "Please try again" });
			}
		}
	}, [actionData, navigate]);

	return (
		<section className="flex w-full min-h-screen items-center justify-center py-8 px-4">
			<div className="w-full max-w-md">
				<form onSubmit={handleSubmit(onFormSubmit)}>
					<Card>
						<CardHeader className="text-center">
							<CardTitle className="text-xl">Welcome back</CardTitle>
							<CardDescription>Log in to your LeadGuard workspace</CardDescription>
						</CardHeader>

						<CardContent>
							<FieldSet>
								<FieldLegend className="sr-only">Login credentials</FieldLegend>

								<FieldGroup>
									{/* Email */}
									<Controller
										control={control}
										name="email"
										render={({ field }) => (
											<Field data-invalid={!!errors.email}>
												<FieldLabel htmlFor="email">Email</FieldLabel>
												<div className="relative">
													<MailIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
													<Input
														id="email"
														type="email"
														placeholder="you@company.com"
														className="pl-9"
														autoComplete="email"
														aria-invalid={!!errors.email}
														{...field}
													/>
												</div>
												{errors.email && (
													<FieldError>{errors.email.message}</FieldError>
												)}
											</Field>
										)}
									/>

									{/* Password */}
									<Controller
										control={control}
										name="password"
										render={({ field }) => (
											<Field data-invalid={!!errors.password}>
												<FieldLabel htmlFor="password">Password</FieldLabel>
												<div className="relative">
													<LockIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
													<Input
														id="password"
														type={showPassword ? "text" : "password"}
														placeholder="Your password"
														className="pl-9 pr-10"
														autoComplete="current-password"
														aria-invalid={!!errors.password}
														{...field}
													/>
													<button
														type="button"
														onClick={() => setShowPassword((prev) => !prev)}
														className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
													>
														{showPassword ? (
															<EyeOffIcon className="size-4" />
														) : (
															<EyeIcon className="size-4" />
														)}
													</button>
												</div>
												{errors.password && (
													<FieldError>{errors.password.message}</FieldError>
												)}
											</Field>
										)}
									/>
								</FieldGroup>
							</FieldSet>

							<Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
								{isSubmitting && <Loader2 className="animate-spin mr-2 size-4" />}
								Log in
							</Button>

							<div className="flex justify-center gap-1 items-center mt-4 text-sm">
								<span className="text-muted-foreground">Don't have an account?</span>
								<Link to="/signup" className="underline-offset-4 hover:underline font-medium">
									Sign up
								</Link>
							</div>
						</CardContent>
					</Card>
				</form>
			</div>
		</section>
	);
}
