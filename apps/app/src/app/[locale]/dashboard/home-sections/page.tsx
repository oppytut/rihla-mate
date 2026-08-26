"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  EMPTY_BUREAU_HOME_SECTIONS,
  parseBureauHomeSections,
  type BureauGalleryItem,
  type BureauHomeSections,
  type BureauTestimonialItem,
  type BureauTextItem,
} from "@/lib/bureau-home-sections";

function cloneEmpty(): BureauHomeSections {
  return parseBureauHomeSections(null);
}

export default function HomeSectionsPage() {
  const t = useTranslations("homeSections");
  const trpc = useTRPC();
  const [form, setForm] = useState<BureauHomeSections>(cloneEmpty);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  const settingsQuery = useQuery(trpc.settings.getHomeSections.queryOptions());

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm(parseBureauHomeSections(settingsQuery.data));
  }, [settingsQuery.data]);

  const saveMutation = useMutation(
    trpc.settings.setHomeSections.mutationOptions({
      onSuccess: () => {
        toast.success(t("saved"));
        settingsQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message || t("error"));
      },
    }),
  );

  const update = useCallback(
    <K extends keyof BureauHomeSections>(key: K, value: BureauHomeSections[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateTextItem = useCallback(
    (field: "whyItems" | "howSteps", index: number, patch: Partial<BureauTextItem>) => {
      setForm((prev) => {
        const next = [...prev[field]];
        next[index] = { ...next[index], ...patch };
        return { ...prev, [field]: next };
      });
    },
    [],
  );

  const updateGallery = useCallback((index: number, patch: Partial<BureauGalleryItem>) => {
    setForm((prev) => {
      const next = [...prev.gallery];
      next[index] = { ...next[index], ...patch };
      return { ...prev, gallery: next };
    });
  }, []);

  const updateTestimonial = useCallback((index: number, patch: Partial<BureauTestimonialItem>) => {
    setForm((prev) => {
      const next = [...prev.testimonials];
      next[index] = { ...next[index], ...patch };
      return { ...prev, testimonials: next };
    });
  }, []);

  const handleSave = useCallback(() => {
    saveMutation.mutate(parseBureauHomeSections(form));
  }, [form, saveMutation]);

  const pending = saveMutation.isPending || settingsQuery.isLoading;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        titleTestId="dashboard-heading"
        actions={
          <Button onClick={handleSave} disabled={pending} data-testid="home-sections-save">
            {saveMutation.isPending ? t("saving") : t("save")}
          </Button>
        }
      />

      <div className="flex flex-col gap-8 px-4 py-6 lg:px-8">
        {settingsQuery.isError ? (
          <p className="text-sm text-destructive">
            {t("error")}: {settingsQuery.error.message}
          </p>
        ) : null}

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">{t("whyHeading")}</h2>
          <Field label={t("sectionTitle")} id="whyTitle">
            <Input
              id="whyTitle"
              value={form.whyTitle}
              onChange={(e) => update("whyTitle", e.target.value)}
              placeholder={EMPTY_BUREAU_HOME_SECTIONS.whyTitle}
              disabled={pending}
            />
          </Field>
          <Field label={t("sectionLead")} id="whyLead">
            <Textarea
              id="whyLead"
              value={form.whyLead}
              onChange={(e) => update("whyLead", e.target.value)}
              disabled={pending}
            />
          </Field>
          {form.whyItems.map((item, index) => (
            <div key={`why-${index}`} className="grid gap-3 sm:grid-cols-2">
              <Field label={t("itemTitle", { n: index + 1 })} id={`why-title-${index}`}>
                <Input
                  id={`why-title-${index}`}
                  value={item.title}
                  onChange={(e) => updateTextItem("whyItems", index, { title: e.target.value })}
                  disabled={pending}
                />
              </Field>
              <Field label={t("itemBody", { n: index + 1 })} id={`why-body-${index}`}>
                <Textarea
                  id={`why-body-${index}`}
                  value={item.body}
                  onChange={(e) => updateTextItem("whyItems", index, { body: e.target.value })}
                  disabled={pending}
                />
              </Field>
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">{t("howHeading")}</h2>
          <Field label={t("sectionTitle")} id="howTitle">
            <Input
              id="howTitle"
              value={form.howTitle}
              onChange={(e) => update("howTitle", e.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label={t("sectionLead")} id="howLead">
            <Textarea
              id="howLead"
              value={form.howLead}
              onChange={(e) => update("howLead", e.target.value)}
              disabled={pending}
            />
          </Field>
          {form.howSteps.map((item, index) => (
            <div key={`how-${index}`} className="grid gap-3 sm:grid-cols-2">
              <Field label={t("stepTitle", { n: index + 1 })} id={`how-title-${index}`}>
                <Input
                  id={`how-title-${index}`}
                  value={item.title}
                  onChange={(e) => updateTextItem("howSteps", index, { title: e.target.value })}
                  disabled={pending}
                />
              </Field>
              <Field label={t("stepBody", { n: index + 1 })} id={`how-body-${index}`}>
                <Textarea
                  id={`how-body-${index}`}
                  value={item.body}
                  onChange={(e) => updateTextItem("howSteps", index, { body: e.target.value })}
                  disabled={pending}
                />
              </Field>
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">{t("galleryHeading")}</h2>
          <Field label={t("sectionTitle")} id="galleryTitle">
            <Input
              id="galleryTitle"
              value={form.galleryTitle}
              onChange={(e) => update("galleryTitle", e.target.value)}
              disabled={pending}
            />
          </Field>
          {form.gallery.map((item, index) => (
            <div key={`gal-${index}`} className="grid gap-3 sm:grid-cols-2">
              <Field label={t("imageUrl", { n: index + 1 })} id={`gal-src-${index}`}>
                <Input
                  id={`gal-src-${index}`}
                  value={item.src}
                  onChange={(e) => updateGallery(index, { src: e.target.value })}
                  disabled={pending}
                />
              </Field>
              <Field label={t("imageAlt", { n: index + 1 })} id={`gal-alt-${index}`}>
                <Input
                  id={`gal-alt-${index}`}
                  value={item.alt}
                  onChange={(e) => updateGallery(index, { alt: e.target.value })}
                  disabled={pending}
                />
              </Field>
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">{t("testimonialsHeading")}</h2>
          <Field label={t("sectionTitle")} id="testimonialsTitle">
            <Input
              id="testimonialsTitle"
              value={form.testimonialsTitle}
              onChange={(e) => update("testimonialsTitle", e.target.value)}
              disabled={pending}
            />
          </Field>
          {form.testimonials.map((item, index) => (
            <div key={`tes-${index}`} className="grid gap-3 sm:grid-cols-2">
              <Field label={t("quote", { n: index + 1 })} id={`tes-quote-${index}`}>
                <Textarea
                  id={`tes-quote-${index}`}
                  value={item.quote}
                  onChange={(e) => updateTestimonial(index, { quote: e.target.value })}
                  disabled={pending}
                />
              </Field>
              <Field label={t("name", { n: index + 1 })} id={`tes-name-${index}`}>
                <Input
                  id={`tes-name-${index}`}
                  value={item.name}
                  onChange={(e) => updateTestimonial(index, { name: e.target.value })}
                  disabled={pending}
                />
              </Field>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
