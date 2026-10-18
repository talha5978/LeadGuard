import { useState } from "react";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import {
	ShieldCheck,
	Zap,
	Clock,
	AlertTriangle,
	CheckCircle2,
	ArrowRight,
	Users,
	BarChart3,
	Building2,
	ChevronDown,
	Sparkles,
	BellRing,
	UserCheck,
	HelpCircle,
} from "lucide-react";
import { getCurrentUser } from "@workspace/shared/queries/auth.q.js";

export function meta() {
	return [
		{ title: "LeadGuard | Guaranteed Lead Response & Ownership Platform" },
		{
			name: "description",
			content:
				"Never lose another lead. LeadGuard automatically assigns, tracks SLA response times, and escalates unacknowledged leads for service businesses.",
		},
	];
}

export async function loader({ request }: LoaderFunctionArgs) {
	const headers = new Headers(request.headers);

	const {
		data: { user },
	} = await getCurrentUser(request, headers);

	return { user };
}

export default function Home() {
	const [activeFaq, setActiveFaq] = useState<number | null>(null);

	const toggleFaq = (index: number) => {
		setActiveFaq(activeFaq === index ? null : index);
	};

	const { user } = useLoaderData<typeof loader>();

	return (
		<div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent selection:text-accent-foreground">
			{/* ========== TOP ANNOUNCEMENT BANNER ========== */}
			<div className="bg-primary text-primary-foreground text-xs sm:text-sm py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
				<span className="bg-background/20 text-primary-foreground px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase">
					New
				</span>
				<span>Automated WhatsApp & SMS Escalation Rules are now live!</span>
				<Link
					to="/signup"
					className="underline hover:opacity-80 transition-opacity flex items-center gap-1 font-semibold ml-1"
				>
					Learn more <ArrowRight className="w-3 h-3 inline" />
				</Link>
			</div>

			{/* ========== NAVBAR ========== */}
			<header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-all">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					{/* Logo */}
					<Link
						to="/"
						className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-foreground hover:opacity-90 transition-opacity"
					>
						<div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<span className="font-extrabold text-foreground">
							Lead<span className="text-primary">Guard</span>
						</span>
					</Link>

					{/* Navigation Links */}
					<nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
						<a href="#features" className="hover:text-primary transition-colors">
							Features
						</a>
						<a href="#how-it-works" className="hover:text-primary transition-colors">
							How it Works
						</a>
						<a href="#social-proof" className="hover:text-primary transition-colors">
							Why LeadGuard
						</a>
						<a href="#faq" className="hover:text-primary transition-colors">
							FAQ
						</a>
					</nav>

					{/* Action Buttons */}
					{user ? (
						<Link to="/d">
							<Button className="bg-primary text-primary-foreground font-semibold shadow-sm transition-all">
								Dashboard
							</Button>
						</Link>
					) : (
						<div className="flex items-center gap-3">
							<Link to="/login">
								<Button variant="ghost" className="text-foreground font-medium">
									Log in
								</Button>
							</Link>
							<Link to="/signup">
								<Button className="bg-primary text-primary-foreground font-semibold shadow-sm transition-all">
									Get Started Free
								</Button>
							</Link>
						</div>
					)}
				</div>
			</header>

			{/* ========== HERO SECTION ========== */}
			<section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
				{/* Background Decorative Gradients */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-accent/30 -z-10 pointer-events-none rounded-b-full blur-2xl" />

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					{/* Tag Pill */}
					<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent text-accent-foreground border border-border text-xs sm:text-sm font-semibold mb-8 shadow-xs">
						<Sparkles className="w-4 h-4 text-primary" />
						<span>Built for high-velocity sales & service teams</span>
					</div>

					{/* Headline */}
					<h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15]">
						Every lead gets an owner. <br className="hidden sm:inline" />
						<span className="text-primary">No exceptions.</span>
					</h1>

					{/* Subtitle */}
					<p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
						LeadGuard instantly routes incoming leads, enforces strict response SLA countdowns,
						and escalates neglected inquiries before prospects move on to competitors.
					</p>

					{/* Trust Micro-text */}
					<p className="mt-4 text-xs text-muted-foreground font-medium flex items-center justify-center gap-4">
						<span>✓ No credit card required</span>
						<span>•</span>
						<span>✓ 2-minute setup</span>
						<span>•</span>
						<span>✓ Integrates with existing CRMs</span>
					</p>

					{/* APP DASHBOARD PREVIEW / MOCKUP */}
					<div className="mt-16 relative max-w-5xl mx-auto">
						<div className="rounded-2xl border border-border bg-card/50 p-2 sm:p-3 shadow-2xl backdrop-blur-xl">
							<div className="rounded-xl bg-card overflow-hidden border border-border text-left text-card-foreground shadow-inner">
								{/* Dashboard Topbar */}
								<div className="bg-muted px-4 py-3 border-b border-border flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="w-3 h-3 rounded-full bg-destructive" />
										<div className="w-3 h-3 rounded-full bg-primary" />
										<div className="w-3 h-3 rounded-full bg-emerald-500" />
										<span className="text-xs text-muted-foreground font-mono ml-2">
											leadguard.app/workspace/live-dispatch
										</span>
									</div>
									<div className="flex items-center gap-3 text-xs text-muted-foreground">
										<span className="flex items-center gap-1.5">
											<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
											Live SLA Engine
										</span>
									</div>
								</div>

								{/* Dashboard Mock Content */}
								<div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-background text-xs">
									{/* Lead Card 1 - Active Countdown */}
									<div className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
										<div className="flex items-start justify-between">
											<div>
												<span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-accent px-2 py-0.5 rounded border border-border">
													SLA Pending (02:45)
												</span>
												<h4 className="font-bold text-sm text-card-foreground mt-2">
													Apex Legal Group
												</h4>
												<p className="text-muted-foreground text-[11px]">
													Commercial Litigation Inquiry
												</p>
											</div>
											<div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold">
												AL
											</div>
										</div>
										<div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-muted-foreground">
											<span>
												Assigned to:{" "}
												<strong className="text-card-foreground">Sarah M.</strong>
											</span>
											<span className="text-emerald-500 font-medium">Online</span>
										</div>
									</div>

									{/* Lead Card 2 - Escalated Warning */}
									<div className="bg-card border border-destructive/30 rounded-lg p-4 relative">
										<div className="flex items-start justify-between">
											<div>
												<span className="text-[10px] font-bold text-destructive uppercase tracking-wider bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 flex items-center gap-1">
													<AlertTriangle className="w-3 h-3" /> Escalated to Manager
												</span>
												<h4 className="font-bold text-sm text-card-foreground mt-2">
													Metro HVAC Systems
												</h4>
												<p className="text-muted-foreground text-[11px]">
													Emergency Service Lead
												</p>
											</div>
											<div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-bold">
												MH
											</div>
										</div>
										<div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-muted-foreground">
											<span>
												Previous:{" "}
												<span className="line-through text-muted-foreground">
													Dave K.
												</span>
											</span>
											<span className="text-destructive font-medium">Reassigned!</span>
										</div>
									</div>

									{/* Lead Card 3 - Claimed */}
									<div className="bg-card border border-border rounded-lg p-4">
										<div className="flex items-start justify-between">
											<div>
												<span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
													<CheckCircle2 className="w-3 h-3" /> Acknowledged (18s)
												</span>
												<h4 className="font-bold text-sm text-card-foreground mt-2">
													Solaris Tech Inc.
												</h4>
												<p className="text-muted-foreground text-[11px]">
													Enterprise Subscription
												</p>
											</div>
											<div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">
												ST
											</div>
										</div>
										<div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-muted-foreground">
											<span>
												Owner:{" "}
												<strong className="text-card-foreground">Alex R.</strong>
											</span>
											<span className="text-muted-foreground">In Call</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ========== LOGOS / METRICS BAR ========== */}
			<section className="border-y border-border bg-muted/50 py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-8">
						Trusted by fast-growing service providers & sales teams worldwide
					</p>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
						<div>
							<div className="text-3xl font-extrabold text-foreground">&lt; 3 mins</div>
							<div className="text-sm font-medium text-muted-foreground mt-1">
								Avg Lead Response Time
							</div>
						</div>
						<div>
							<div className="text-3xl font-extrabold text-foreground">0%</div>
							<div className="text-sm font-medium text-muted-foreground mt-1">
								Unassigned Leads Lost
							</div>
						</div>
						<div>
							<div className="text-3xl font-extrabold text-foreground">4.2x</div>
							<div className="text-sm font-medium text-muted-foreground mt-1">
								Higher Conversion Rate
							</div>
						</div>
						<div>
							<div className="text-3xl font-extrabold text-foreground">99.8%</div>
							<div className="text-sm font-medium text-muted-foreground mt-1">
								Team SLA Compliance
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ========== PROBLEM SECTION ========== */}
			<section id="features" className="py-24 bg-background">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<span className="text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
							The Problem
						</span>
						<h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-4 tracking-tight">
							The high cost of unanswered lead inquiries
						</h2>
						<p className="mt-4 text-muted-foreground text-lg">
							Most businesses spend thousands driving leads, only to lose deals because no
							single person was accountable for responding immediately.
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{[
							{
								icon: Users,
								title: "Unclear Lead Ownership",
								desc: "Leads get forwarded to group emails or Slack channels. Everyone assumes someone else will handle it, leaving high-value leads sitting unread.",
							},
							{
								icon: Clock,
								title: "Zero Escalation Safeguards",
								desc: "When rep is busy, in a meeting, or on leave, lead response halts. Standard CRMs don't reassign forgotten inquiries automatically.",
							},
							{
								icon: BarChart3,
								title: "Scattered Tool Silos",
								desc: "Forms, WhatsApp, phone, and CRMs exist in isolation. Management lacks real-time visibility into which rep actually claimed and responded.",
							},
						].map((item, idx) => (
							<div
								key={idx}
								className="bg-card border border-border p-8 rounded-2xl hover:shadow-lg transition-all group"
							>
								<div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
									<item.icon className="w-6 h-6" />
								</div>
								<h3 className="text-xl font-bold text-card-foreground mb-3">{item.title}</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ========== HOW IT WORKS / SOLUTION SECTION ========== */}
			<section id="how-it-works" className="py-24 bg-muted/30 border-t border-border">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<span className="text-xs font-bold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full border border-border">
							The LeadGuard Engine
						</span>
						<h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-4 tracking-tight">
							A foolproof, automated fail-safe for every incoming lead
						</h2>
						<p className="mt-4 text-muted-foreground text-lg">
							One connected dispatch system designed to guarantee instantaneous contact and
							maximum closing rates.
						</p>
					</div>

					<div className="grid lg:grid-cols-2 gap-12 items-center">
						{/* Steps List */}
						<div className="space-y-6">
							{[
								{
									step: "01",
									icon: UserCheck,
									title: "Smart Capacity Routing",
									desc: "Assigns leads based on rep availability, active load, shift schedules, and expertise—eliminating overload on busy reps.",
								},
								{
									step: "02",
									icon: BellRing,
									title: "Forced SLA Countdown",
									desc: "Reps receive high-priority alerts via SMS, WhatsApp, or Push with a visible timer (e.g. 5 mins) to acknowledge receipt.",
								},
								{
									step: "03",
									icon: Zap,
									title: "Automatic Multi-Tier Escalation",
									desc: "If the initial rep fails to acknowledge within the time window, the lead instantly transfers to the next rep or team manager.",
								},
								{
									step: "04",
									icon: ShieldCheck,
									title: "Manager Recovery Queue",
									desc: "Any edge-case or multi-escalated inquiry lands in a high-visibility queue for executive intervention before the deal is cold.",
								},
							].map((item) => (
								<div
									key={item.step}
									className="p-6 rounded-xl bg-card border border-border shadow-xs flex gap-5 hover:border-primary/50 transition-colors"
								>
									<div className="shrink-0">
										<div className="w-10 h-10 rounded-lg bg-accent text-primary flex items-center justify-center font-bold text-sm">
											<item.icon className="w-5 h-5" />
										</div>
									</div>
									<div>
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold text-primary uppercase tracking-wide">
												Step {item.step}
											</span>
										</div>
										<h3 className="text-lg font-bold text-card-foreground mt-0.5">
											{item.title}
										</h3>
										<p className="text-muted-foreground text-sm mt-1 leading-relaxed">
											{item.desc}
										</p>
									</div>
								</div>
							))}
						</div>

						{/* Visual Demo Card */}
						<div className="bg-card border border-border rounded-2xl p-8 text-card-foreground shadow-xl relative overflow-hidden">
							<div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

							<div className="flex items-center justify-between border-b border-border pb-4 mb-6">
								<div className="flex items-center gap-2">
									<Building2 className="w-5 h-5 text-primary" />
									<span className="font-semibold text-sm">Real-time Lead Dispatch</span>
								</div>
								<span className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full font-mono border border-border">
									SLA: 05:00 MAX
								</span>
							</div>

							{/* Mock Timeline Visual */}
							<div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
								<div className="relative flex items-start gap-4">
									<div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold z-10">
										✓
									</div>
									<div>
										<h4 className="text-sm font-semibold">
											Lead Inbound from Website Form
										</h4>
										<p className="text-xs text-muted-foreground mt-0.5">
											Assigned to: Marcus Vance (Round-Robin)
										</p>
										<span className="text-[10px] text-muted-foreground font-mono">
											10:42:00 AM
										</span>
									</div>
								</div>

								<div className="relative flex items-start gap-4">
									<div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10">
										!
									</div>
									<div>
										<h4 className="text-sm font-semibold text-primary">
											SLA Warning: Unacknowledged (5m)
										</h4>
										<p className="text-xs text-muted-foreground mt-0.5">
											Marcus inactive on web & mobile dashboard
										</p>
										<span className="text-[10px] text-muted-foreground font-mono">
											10:47:00 AM
										</span>
									</div>
								</div>

								<div className="relative flex items-start gap-4">
									<div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold z-10 border border-border">
										<Zap className="w-3.5 h-3.5" />
									</div>
									<div>
										<h4 className="text-sm font-semibold">Automated Re-assignment</h4>
										<p className="text-xs text-muted-foreground mt-0.5">
											Lead transferred to Senior Rep: Elena Rostova
										</p>
										<span className="text-[10px] text-muted-foreground font-mono">
											10:47:01 AM
										</span>
									</div>
								</div>
							</div>

							<div className="mt-8 bg-muted border border-border p-4 rounded-xl text-center">
								<span className="text-xs text-muted-foreground font-medium">
									Result: Response secured in{" "}
									<strong className="text-card-foreground">12 seconds</strong>{" "}
									post-escalation.
								</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ========== FAQ SECTION ========== */}
			<section id="faq" className="py-24 bg-background">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<span className="text-xs font-bold uppercase tracking-wider text-primary bg-accent px-3 py-1 rounded-full border border-border">
							Got Questions?
						</span>
						<h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-4 tracking-tight">
							Frequently Asked Questions
						</h2>
					</div>

					<div className="space-y-4">
						{[
							{
								q: "How does LeadGuard integrate with our current CRM?",
								a: "LeadGuard connects seamlessly via Webhooks, Zapier, HubSpot, Salesforce, and direct API endpoints. You can keep your existing forms and CRM while LeadGuard sits on top as your response & SLA enforcement layer.",
							},
							{
								q: "What happens if all sales reps are offline or on leave?",
								a: "You can configure off-hours rules and shift rotas. If all assigned team members are unavailable, LeadGuard automatically routes to your designated backup contacts or holding queue with SMS notifications to management.",
							},
							{
								q: "How are notifications sent to team members?",
								a: "Alerts can be dispatched via push notifications, automated SMS, WhatsApp messages, Slack/Teams pings, or phone calls based on your customized escalation urgency levels.",
							},
							{
								q: "Can I customize response countdown windows?",
								a: "Yes! SLA countdown limits can be set down to the minute per lead channel, lead priority, or service type (e.g., 2 minutes for urgent quotes, 15 minutes for general inquiries).",
							},
						].map((faq, index) => (
							<div
								key={index}
								className="border border-border rounded-xl overflow-hidden transition-colors bg-card"
							>
								<button
									onClick={() => toggleFaq(index)}
									className="w-full p-5 text-left font-semibold text-card-foreground flex items-center justify-between hover:bg-muted/50"
								>
									<span className="flex items-center gap-2">
										<HelpCircle className="w-5 h-5 text-primary shrink-0" />
										{faq.q}
									</span>
									<ChevronDown
										className={`w-5 h-5 text-muted-foreground transition-transform ${activeFaq === index ? "rotate-180" : ""}`}
									/>
								</button>
								{activeFaq === index && (
									<div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
										{faq.a}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ========== FINAL CALL TO ACTION ========== */}
			<section className="bg-primary text-primary-foreground relative overflow-hidden py-24">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />

				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
					<h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
						Stop losing qualified leads to slow response times.
					</h2>
					<p className="mt-5 text-primary-foreground/90 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
						Set up LeadGuard in under 5 minutes and guarantee every inquiry gets an immediate
						owner.
					</p>

					<div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Link to="/signup" className="w-full sm:w-auto">
							<Button
								size="lg"
								className="w-full sm:w-auto text-base px-8 h-13 bg-background text-foreground hover:bg-muted font-bold shadow-xl"
							>
								Create Free Workspace Now
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* ========== FOOTER ========== */}
			<footer className="border-t border-border bg-background">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						<div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
							LG
						</div>
						<span className="font-semibold text-foreground">LeadGuard</span>
						<span>© {new Date().getFullYear()} LeadGuard Inc. All rights reserved.</span>
					</div>

					<div className="flex items-center gap-6">
						<a href="#features" className="hover:text-foreground transition-colors">
							Features
						</a>
						<a href="#faq" className="hover:text-foreground transition-colors">
							FAQ
						</a>
						<Link to="/login" className="hover:text-foreground transition-colors">
							Log in
						</Link>
						<Link to="/signup" className="hover:text-foreground transition-colors">
							Sign up
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
