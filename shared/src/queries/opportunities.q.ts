import { queryOptions } from "@tanstack/react-query";
import {
	OpportunitiesService,
	type OpportunityFilters,
} from "@workspace/shared/services/opportunities.service";
import type { AppUser } from "@workspace/shared/types/auth";

type OpportunitiesQueryArgs = {
	request: Request;
	filters?: OpportunityFilters;
	page?: number;
	pageSize?: number;
};

export const opportunitiesQuery = ({
	request,
	filters = {},
	page = 1,
	pageSize = 20,
}: OpportunitiesQueryArgs) => {
	return queryOptions({
		queryKey: ["opportunities", filters, page, pageSize],
		queryFn: async () => {
			const service = new OpportunitiesService(request);
			return service.getAll(filters, page, pageSize);
		},
	});
};

export const recoveryQueueQuery = ({ request, user }: { request: Request; user: AppUser }) => {
	return queryOptions({
		queryKey: ["recovery-queue"],
		queryFn: async () => {
			const service = new OpportunitiesService(request);
			return service.getRecoveryQueue(user);
		},
	});
};
