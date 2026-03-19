//frontend/src/components/ProposalForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Proposal, ProposalStatus } from "../proposalsApi";

type ProjectOption = {
  id: number;
  name: string;
  obra_entrega_prevista?: string | null;
};

type ProposalFormValues = Partial<Proposal> & {
  projects?: number[];
  _file?: File | null;
};

type CurrentAttachment = {
  id: number;
  file?: string;
  file_url?: string;
};

type Props = {
  loading: boolean;
  projects: ProjectOption[];
  onSubmit: (payload: ProposalFormValues) => void;
  initialData?: Partial<Proposal> & {
    projects?: number[];
  };
  submitLabel?: string;
  showFileField?: boolean;
  isEditing?: boolean;
  currentAttachment?: CurrentAttachment | null;
  onDeleteAttachment?: (id: number) => void;
};

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 " +
  "outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300";

const inputClsDisabled =
  "w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-slate-600 placeholder:text-slate-400 " +
  "outline-none cursor-not-allowed";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function PrimaryButton({
  loading,
  disabled,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white transition hover:bg-slate-800 active:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Salvando..." : children}
    </button>
  );
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d.,]/g, "");
}

function parseMoneyToNumberOrNull(s: string) {
  const t = (s || "").trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function moneyToInput(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(".", ",");
}

function formatMonthYear(value?: string | null) {
  if (!value) return "";
  const ym = String(value).match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[2]}/${ym[1]}`;

  const ymd = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[2]}/${ymd[1]}`;

  return String(value);
}

function parseMonthYearInput(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const m = raw.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;

  const month = Number(m[1]);
  const year = m[2];

  if (month < 1 || month > 12) return null;

  return `${year}-${String(month).padStart(2, "0")}`;
}

function normalizeMonthYearTyping(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function currentYearMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ProposalForm({
  loading,
  projects,
  onSubmit,
  initialData,
  submitLabel = "Salvar proposta",
  showFileField = true,
  isEditing = false,
  currentAttachment = null,
  onDeleteAttachment,
}: Props) {
  const [versionLabel, setVersionLabel] = useState(initialData?.version_label || "v1");
  const [status, setStatus] = useState<ProposalStatus>(
    (initialData?.status as ProposalStatus) || "DRAFT"
  );

  const [valorTotal, setValorTotal] = useState(moneyToInput(initialData?.valor_total));
  const [valorEntrada, setValorEntrada] = useState(moneyToInput(initialData?.valor_entrada));

  const [temPermuta, setTemPermuta] = useState(Boolean(initialData?.tem_permuta));
  const [permutaTipo, setPermutaTipo] = useState(initialData?.permuta_tipo || "PARCIAL");
  const [valorPermuta, setValorPermuta] = useState(moneyToInput((initialData as any)?.valor_permuta));

  const [obraEntrega, setObraEntrega] = useState(
    formatMonthYear((initialData as any)?.obra_entrega_prevista || "")
  );
  const [elevEntrega, setElevEntrega] = useState(
    formatMonthYear((initialData as any)?.elevador_entrega_prevista || "")
  );

  const [notes, setNotes] = useState((initialData as any)?.notes || "");
  const [selectedProjects, setSelectedProjects] = useState<number[]>(
    Array.isArray(initialData?.projects) ? initialData!.projects! : []
  );
  const [file, setFile] = useState<File | null>(null);

  const projetoSelecionado =
    selectedProjects.length === 1
      ? projects.find((p) => p.id === selectedProjects[0]) || null
      : null;

  const obraTravada = Boolean(projetoSelecionado?.obra_entrega_prevista);

  useEffect(() => {
    if (selectedProjects.length === 0) {
      setObraEntrega("");
      return;
    }

    if (selectedProjects.length === 1) {
      const p = projects.find((item) => item.id === selectedProjects[0]) || null;
      if (p?.obra_entrega_prevista) {
        setObraEntrega(formatMonthYear(p.obra_entrega_prevista));
      }
    }
  }, [selectedProjects, projects]);

  const obraEntregaParsed = parseMonthYearInput(obraEntrega);
  const elevEntregaParsed = parseMonthYearInput(elevEntrega);

  const obraEntregaMissing = obraEntrega.trim().length === 0;
  const elevEntregaMissing = elevEntrega.trim().length === 0;

  const obraEntregaInvalid =
    obraEntrega.trim().length > 0 && obraEntregaParsed === null;

  const elevEntregaInvalid =
    elevEntrega.trim().length > 0 && elevEntregaParsed === null;

  const elevEntregaPastMonth =
    elevEntregaParsed !== null &&
    elevEntregaParsed !== "" &&
    elevEntregaParsed < currentYearMonth();

  const formInvalid = useMemo(() => {
    return (
      obraEntregaMissing ||
      elevEntregaMissing ||
      obraEntregaInvalid ||
      elevEntregaInvalid ||
      (!isEditing && elevEntregaPastMonth)
    );
  }, [
    obraEntregaMissing,
    elevEntregaMissing,
    obraEntregaInvalid,
    elevEntregaInvalid,
    elevEntregaPastMonth,
    isEditing,
  ]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (formInvalid) return;

        onSubmit({
          version_label: versionLabel || "",
          status,

          valor_total: parseMoneyToNumberOrNull(valorTotal),
          valor_entrada: parseMoneyToNumberOrNull(valorEntrada),

          tem_permuta: temPermuta,
          permuta_tipo: temPermuta ? permutaTipo || "" : "",
          valor_permuta: temPermuta ? parseMoneyToNumberOrNull(valorPermuta) : null,

          obra_entrega_prevista: obraEntregaParsed || null,
          elevador_entrega_prevista: elevEntregaParsed || null,

          notes: notes || "",
          projects: selectedProjects,
          _file: file,
        });
      }}
      className="grid gap-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Versão">
          <input
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="Ex: v1, v2, revA..."
            className={inputCls}
          />
        </Field>

        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProposalStatus)}
            className={inputCls}
          >
            <option value="DRAFT">Rascunho</option>
            <option value="SENT">Enviada</option>
            <option value="ACCEPTED">Aceita</option>
            <option value="REJECTED">Recusada</option>
          </select>
        </Field>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="font-semibold text-slate-900">Empreendimentos</div>
        <div className="mb-2 text-xs text-slate-600">
          Selecione 1 ou mais empreendimentos desta construtora.
        </div>

        {projects.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum empreendimento cadastrado.</div>
        ) : (
          <div className="grid gap-2">
            {projects.map((p) => {
              const checked = selectedProjects.includes(p.id);

              return (
                <label key={p.id} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelectedProjects((prev) =>
                        e.target.checked
                          ? [...prev, p.id]
                          : prev.filter((x) => x !== p.id)
                      )
                    }
                  />
                  <span>{p.name}</span>
                  {p.obra_entrega_prevista ? (
                    <span className="text-xs text-slate-500">
                      • entrega {formatMonthYear(p.obra_entrega_prevista)}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Valor total">
          <input
            value={valorTotal}
            onChange={(e) => setValorTotal(normalizeMoneyInput(e.target.value))}
            placeholder="Ex: 250000,50"
            className={inputCls}
          />
        </Field>

        <Field label="Entrada">
          <input
            value={valorEntrada}
            onChange={(e) => setValorEntrada(normalizeMoneyInput(e.target.value))}
            placeholder="Ex: 50000"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-center gap-2 text-sm text-slate-900">
          <input
            type="checkbox"
            checked={temPermuta}
            onChange={(e) => setTemPermuta(e.target.checked)}
          />
          <span className="font-semibold">Tem permuta?</span>
        </label>

        {temPermuta && (
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tipo">
              <select
                value={permutaTipo}
                onChange={(e) => setPermutaTipo(e.target.value)}
                className={inputCls}
              >
                <option value="PARCIAL">Parcial</option>
                <option value="TOTAL">Total</option>
              </select>
            </Field>

            <Field label="Valor estimado da permuta">
              <input
                value={valorPermuta}
                onChange={(e) => setValorPermuta(normalizeMoneyInput(e.target.value))}
                placeholder="Ex: 120000"
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Entrega da obra *">
          <div className="grid gap-1">
            <input
              value={obraEntrega}
              onChange={(e) => setObraEntrega(normalizeMonthYearTyping(e.target.value))}
              placeholder="12/2026"
              className={obraTravada ? inputClsDisabled : inputCls}
              disabled={obraTravada}
            />
            {obraTravada && (
              <div className="text-xs text-slate-500">
                Data fixa do empreendimento selecionado.
              </div>
            )}
            {!obraTravada && obraEntregaMissing && (
              <div className="text-xs text-red-600">Informe a entrega da obra.</div>
            )}
            {!obraEntregaMissing && obraEntregaInvalid && (
              <div className="text-xs text-red-600">Informe no formato MM/AAAA.</div>
            )}
          </div>
        </Field>

        <Field label="Entrega dos elevadores *">
          <div className="grid gap-1">
            <input
              value={elevEntrega}
              onChange={(e) => setElevEntrega(normalizeMonthYearTyping(e.target.value))}
              placeholder="12/2026"
              className={inputCls}
            />
            {elevEntregaMissing && (
              <div className="text-xs text-red-600">
                Informe a entrega dos elevadores.
              </div>
            )}
            {!elevEntregaMissing && elevEntregaInvalid && (
              <div className="text-xs text-red-600">Informe no formato MM/AAAA.</div>
            )}
            {!elevEntregaMissing && !elevEntregaInvalid && elevEntregaPastMonth && (
              <div className="text-xs text-red-600">
                A entrega dos elevadores não pode ser inferior ao mês atual.
              </div>
            )}
          </div>
        </Field>
      </div>

      {showFileField && (
        <div className="grid gap-1">
          <label className="text-xs font-semibold text-slate-700">
            Arquivo da proposta
          </label>

          {currentAttachment ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <a
                  href={currentAttachment.file_url || currentAttachment.file}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
                >
                  Abrir anexo atual
                </a>
                <button
                  type="button"
                  onClick={() => onDeleteAttachment?.(currentAttachment.id)}
                  className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 active:bg-red-100"
                >
                  Excluir
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Cada proposta pode ter apenas 1 arquivo. Para substituir, exclua o atual primeiro.
              </div>
            </div>
          ) : (
            <div className="grid gap-1">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
              />
              <div className="text-[11px] text-slate-500">
                Cada proposta suporta apenas <b>1 arquivo</b>. Outros tipos de anexo
                (contrato, memorial etc.) devem ser adicionados diretamente na oportunidade.
              </div>
            </div>
          )}
        </div>
      )}

      <Field label="Observações">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Condições, escopo, prazos..."
          className={inputCls}
        />
      </Field>

      <PrimaryButton loading={loading} disabled={loading || formInvalid}>
        {submitLabel}
      </PrimaryButton>
    </form>
  );
}