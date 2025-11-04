import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { CreateLeadSchema, type CreateLead, type LeadWithId } from "../../../shared/models/lead";

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLead) => void;
  initialData?: Partial<LeadWithId>;
  isLoading?: boolean;
  error?: string;
}

export default function LeadForm({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
  error,
}: LeadFormProps) {
  const isEditing = !!initialData?._id;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateLead>({
    resolver: zodResolver(CreateLeadSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      status: initialData?.status || "new",
      engagementScore: initialData?.engagementScore || 0,
    },
  });

  const statusValue = watch("status");

  // Reset form when initialData changes or dialog opens
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        status: initialData.status || "new",
        engagementScore: initialData.engagementScore || 0,
      });
    } else {
      reset({
        name: "",
        phone: "",
        email: "",
        status: "new",
        engagementScore: 0,
      });
    }
  }, [initialData, reset, open]);

  const handleFormSubmit = (data: CreateLead) => {
    onSubmit(data);
    if (!isEditing) {
      reset();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the lead information below."
              : "Fill in the information to create a new lead."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter lead name"
                {...register("name")}
                data-testid="lead-form-name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                {...register("phone")}
                data-testid="lead-form-phone"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...register("email")}
                data-testid="lead-form-email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusValue}
                onValueChange={(value) => setValue("status", value as CreateLead["status"])}
                data-testid="lead-form-status"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="engagementScore">Engagement Score (0-100)</Label>
              <Input
                id="engagementScore"
                type="number"
                min="0"
                max="100"
                placeholder="Enter engagement score"
                {...register("engagementScore", { valueAsNumber: true })}
                data-testid="lead-form-engagement-score"
              />
              {errors.engagementScore && (
                <p className="text-sm text-destructive">
                  {errors.engagementScore.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="lead-form-submit"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Update Lead" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}