export interface NavSubItem {
	title: string;
	url: string;
	icon: JSX.Element;
	roles: string[];
}

export interface NavItem {
	title: string;
	items: NavSubItem[];
}
