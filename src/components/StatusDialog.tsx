"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Health } from "@/hooks/use-health";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 border-b py-2 text-sm last:border-0">
    <dt className="text-muted-foreground">{label}</dt>
    <dd>{children}</dd>
  </div>
);

export const StatusDialog = ({
  health,
  open,
  onOpenChange,
}: {
  health: Health | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Status</DialogTitle>
        <DialogDescription>Read-only. Change these in the .env file and restart the server.</DialogDescription>
      </DialogHeader>
      {health ? (
        <dl>
          <Row label="Provider">{health.provider}</Row>
          <Row label="Model">
            <code>{health.model}</code>
          </Row>
          <Row label="API key">
            <Badge variant={health.keyConfigured ? "secondary" : "destructive"}>
              {health.keyConfigured ? "Configured" : "Missing"}
            </Badge>
          </Row>
          <Row label="Business timezone">{health.timeZone}</Row>
          <Row label="Storage">
            <code>tasks.json</code> (local, single user)
          </Row>
        </dl>
      ) : (
        <p className="text-sm text-destructive">Could not reach the server.</p>
      )}
    </DialogContent>
  </Dialog>
);
