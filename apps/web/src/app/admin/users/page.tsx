"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PLAN_DETAILS, type AdminUserDTO } from "@droba/shared";
import { api } from "@/lib/auth";
import { initials } from "@/lib/format";
import { VerifiedSeal } from "@/components/Icon";
import { Empty } from "@/components/listing";
import { StudioHeader } from "@/components/studio-ui";
import { ReasonAction, SearchBox, when } from "@/components/admin-ui";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminUserDTO[] | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      api<{ items: AdminUserDTO[] }>(`/admin/users?q=${encodeURIComponent(q)}`)
        .then((r) => setItems(r.items))
        .catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, n]);
  const reload = () => setN((x) => x + 1);

  return (
    <>
      <StudioHeader title="People" sub="Find anyone by name, email, phone or store. Suspending someone logs them out everywhere, hides their listings and declines their open order requests." />
      <div className="mb-4">
        <SearchBox value={q} onChange={setQ} placeholder="Name, email, phone or store" />
      </div>
      {!items ? (
        <div className="skeleton h-40 rounded-lg" />
      ) : !items.length ? (
        <Empty title="No one found" />
      ) : (
        <ul className="grid gap-2">
          {items.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blush text-[13px] font-extrabold text-red-deep">{initials(u.name)}</span>
              <span className="min-w-0 flex-1">
                <b className="flex flex-wrap items-center gap-2 text-[14.5px]">
                  {u.name}
                  {u.role === "ADMIN" && <span className="pill bg-ink text-white">Admin</span>}
                  {u.suspendedAt && <span className="pill bg-blush text-red-deep">Suspended</span>}
                  {u.reports > 0 && <span className="pill bg-warn-bg text-warn">{u.reports} open report{u.reports === 1 ? "" : "s"}</span>}
                </b>
                <span className="block truncate text-[13px] text-muted">
                  {u.email}
                  {u.phone && ` · ${u.phone.replace("+234", "0")}`} · joined {new Date(u.createdAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}
                </span>
                {u.seller && (
                  <Link href={u.seller.handle ? `/${u.seller.handle}` : `/seller/${u.seller.id}`} target="_blank" className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-semibold hover:text-red">
                    {u.seller.displayName}
                    {u.seller.verified && <VerifiedSeal size={13} business={u.seller.plan === "BUSINESS"} />}
                    <span className="font-normal text-muted">
                      · {PLAN_DETAILS[u.seller.plan].label} · {u.seller.activeListings} live
                    </span>
                  </Link>
                )}
                {u.suspendedAt && (
                  <span className="block text-[12.5px] text-red-deep">
                    Suspended {when(u.suspendedAt)}: {u.suspendedReason}
                  </span>
                )}
              </span>
              {u.role !== "ADMIN" &&
                (u.suspendedAt ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      await api(`/admin/users/${u.id}/unsuspend`, { method: "POST" });
                      reload();
                    }}
                  >
                    Lift suspension
                  </button>
                ) : (
                  <div className="w-full sm:w-auto">
                    <ReasonAction
                      label="Suspend"
                      placeholder="Reason they'll see by email"
                      onConfirm={async (reason) => {
                        await api(`/admin/users/${u.id}/suspend`, { body: { reason } });
                        reload();
                      }}
                    />
                  </div>
                ))}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
