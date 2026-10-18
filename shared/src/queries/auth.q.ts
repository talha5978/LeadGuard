import { AuthService } from "@workspace/shared/services/auth.service";

export const getCurrentUser = async (request: Request, headers: Headers) => {
	const authSvc = new AuthService(request, {
		headers,
	});
	const result = await authSvc.getCurrentUser();
	return { data: result, headers };
};
