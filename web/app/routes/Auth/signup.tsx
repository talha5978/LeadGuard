import { EyeIcon, EyeOffIcon, Loader2, LockIcon, MailIcon, UserIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "~/components/ui/field";
import { toast } from "sonner";
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
import { useEffect, useState } from "react";
import { AuthService } from "@workspace/shared/services/auth.service.js";
import { signupSchema, type SignupFormData } from "@workspace/shared/schemas/signup.schema.js";
import { ApiError } from "@workspace/shared/utils/ApiError.js";
import type { ActionResponse } from "@workspace/shared/types/action-data.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getCurrentUser } from "@workspace/shared/queries/auth.q.js";
import { genAuthSecurity } from "@workspace/shared/utils/auth-utils.server.js";
// import { emailService } from "@workspace/shared/services/emails.service";

export async function action({ request }: ActionFunctionArgs) {
	try {
		const formData = await request.formData();
		const firstName = (formData.get("firstName") as string)?.trim();
		const lastName = (formData.get("lastName") as string)?.trim();
		const email = (formData.get("email") as string)?.trim();
		const phone = (formData.get("phone") as string)?.trim() || undefined;
		const password = (formData.get("password") as string)?.trim();

		if (!firstName || !lastName || !email || !password) {
			return { error: "Required fields are missing", success: false };
		}

		const parseResult = signupSchema.safeParse({
			firstName,
			lastName,
			email,
			phone,
			password,
		});

		if (!parseResult.success) {
			const firstError = Object.values(parseResult.error.flatten().fieldErrors).flat()[0]!;
			return { error: firstError, success: false };
		}

		const authSvc = new AuthService(request);
		const { error, session, success, user } = await authSvc.signUpWithPasswordAndProfile({
			firstName,
			lastName,
			email,
			phone,
			password,
		});

		console.log({ error, session, success, user });

		if (error || !success || !user || !session) {
			return { error: error || "Failed to sign up", success: false };
		}

		const { error: loginErr, headers } = await authSvc.loginWithPassword({ email, password });

		if (loginErr) {
			return { error: loginErr.message || "Failed to login", success: false };
		}

		const response = new Response(JSON.stringify({ success: true, error: null }), {
			status: 200,
			statusText: "OK",
			headers: {
				"Content-Type": "application/json",
				"Set-Cookie": headers.get("Set-Cookie") || "",
			},
		});

		return response;
	} catch (error: any) {
		const errorMessage = error instanceof ApiError ? error.message : error.message || "Failed to sign up";
		return { success: false, error: errorMessage };
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	const { headers } = await genAuthSecurity(request);
	const resp = await getCurrentUser(request, headers);
	if (resp.data.user?.id) return redirect("/");

	return { user: null, headers: resp.headers };
}

export const meta = () => {
	return [{ title: "Sign up | LeadGuard" }];
};

export default function SignupPage() {
	const actionData: ActionResponse | undefined = useActionData();
	const navigation = useNavigation();
	const navigate = useNavigate();
	const submit = useSubmit();

	const isSubmitting = navigation.state === "submitting" && navigation.formMethod === "POST";

	const [showPassword, setShowPassword] = useState(false);

	const form = useForm<SignupFormData>({
		resolver: zodResolver(signupSchema),
		mode: "onChange",
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			password: "",
		},
	});

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = form;

	const onFormSubmit = (data: SignupFormData) => {
		const formData = new FormData();
		formData.append("firstName", data.firstName.trim());
		formData.append("lastName", data.lastName.trim());
		formData.append("email", data.email.trim());
		if (data.phone) formData.append("phone", data.phone.trim());
		formData.append("password", data.password.trim());

		submit(formData, { method: "POST", action: "/signup" });
	};

	useEffect(() => {
		if (actionData) {
			console.log(actionData);
			if (actionData.success) {
				toast.success("Signed up successfully.");
				navigate("/login", { replace: true });
			} else if (actionData.error) {
				if (actionData.error === "Failed to login") {
					navigate("/", { replace: true });
				} else {
					toast.error(actionData.error, { description: "Please try again" });
				}
			}
		}
	}, [actionData, navigate]);

	return (
		<section className="flex w-full my-6 items-center py-4 sm:px-4">
			<div className="flex flex-col gap-6 max-w-md w-full mx-auto mt-10">
				<form onSubmit={handleSubmit(onFormSubmit)}>
					<div className="flex flex-col gap-6">
						<Card>
							<CardHeader className="text-center">
								<CardTitle className="text-xl">Create Account</CardTitle>
								<CardDescription>Sign up with Google or email</CardDescription>
							</CardHeader>

							<CardContent>
								{/* ====== NEW FIELD BASED FORM ====== */}
								<FieldSet>
									<FieldLegend className="sr-only">Account details</FieldLegend>
									<FieldDescription className="sr-only">
										Enter your details to create a LeadGuard workspace
									</FieldDescription>

									<FieldGroup>
										{/* First + Last Name */}
										<div className="grid sm:grid-cols-2 gap-4">
											<Controller
												control={control}
												name="firstName"
												render={({ field }) => (
													<Field data-invalid={!!errors.firstName}>
														<FieldLabel htmlFor="firstName">
															First Name
														</FieldLabel>
														<div className="relative">
															<UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
															<Input
																id="firstName"
																placeholder="e.g. John"
																className="pl-9"
																autoComplete="given-name"
																aria-invalid={!!errors.firstName}
																{...field}
															/>
														</div>
														{errors.firstName && (
															<FieldError>
																{errors.firstName.message}
															</FieldError>
														)}
													</Field>
												)}
											/>

											<Controller
												control={control}
												name="lastName"
												render={({ field }) => (
													<Field data-invalid={!!errors.lastName}>
														<FieldLabel htmlFor="lastName">Last Name</FieldLabel>
														<div className="relative">
															<UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
															<Input
																id="lastName"
																placeholder="e.g. Smith"
																className="pl-9"
																autoComplete="family-name"
																aria-invalid={!!errors.lastName}
																{...field}
															/>
														</div>
														{errors.lastName && (
															<FieldError>{errors.lastName.message}</FieldError>
														)}
													</Field>
												)}
											/>
										</div>

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

										{/* Phone (optional) */}
										<Controller
											control={control}
											name="phone"
											render={({ field }) => (
												<Field data-invalid={!!errors.phone}>
													<FieldLabel htmlFor="phone">
														Phone{" "}
														<span className="text-muted-foreground">
															(optional)
														</span>
													</FieldLabel>
													<Input
														id="phone"
														type="tel"
														placeholder="+92 300 1234567"
														autoComplete="tel"
														aria-invalid={!!errors.phone}
														{...field}
													/>
													{errors.phone && (
														<FieldError>{errors.phone.message}</FieldError>
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
															placeholder="Create a strong password"
															className="pl-9 pr-10"
															autoComplete="new-password"
															aria-invalid={!!errors.password}
															{...field}
														/>
														<button
															type="button"
															onClick={() => setShowPassword(!showPassword)}
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
									Create Account
								</Button>

								<div className="flex justify-center gap-1 items-center mt-4 text-sm">
									<span className="text-muted-foreground">Already have an account?</span>
									<Link
										to="/login"
										className="underline-offset-4 hover:underline font-medium"
									>
										Log in
									</Link>
								</div>
							</CardContent>
						</Card>
					</div>
				</form>
			</div>
		</section>
	);
}
