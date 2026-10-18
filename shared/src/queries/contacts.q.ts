import { queryOptions } from "@tanstack/react-query";
import { ContactsService } from "@workspace/shared/services/contacts.service";
import type { ContactFilters } from "@workspace/shared/types/contact";

type ContactsQueryArgs = {
	request: Request;
	filters?: ContactFilters;
	page?: number;
	pageSize?: number;
};

export const contactsQuery = ({ request, filters = {}, page = 1, pageSize = 20 }: ContactsQueryArgs) => {
	return queryOptions({
		queryKey: ["contacts", filters, page, pageSize],
		queryFn: async () => {
			const service = new ContactsService(request);
			return service.getAll(filters, page, pageSize);
		},
	});
};

export const contactByIdQuery = ({ request, id }: { request: Request; id: string }) => {
	return queryOptions({
		queryKey: ["contact", id],
		queryFn: async () => {
			const service = new ContactsService(request);
			return service.getById(id);
		},
	});
};
