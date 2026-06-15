(function () {
    "use strict";

    function nowIso() {
        return new Date().toISOString();
    }

    function createSession() {
        return {
            createdAt: nowIso(),
            updatedAt: nowIso(),
            input: "",
            output: "",
            profile: null,
            processSteps: [],
            exams: []
        };
    }

    function touch(session) {
        if (!session) return;
        session.updatedAt = nowIso();
    }

    function setInput(session, input) {
        if (!session) return;
        session.input = String(input || "");
        touch(session);
    }

    function setOutput(session, output) {
        if (!session) return;
        session.output = String(output || "");
        touch(session);
    }

    function setProfile(session, profile) {
        if (!session) return;
        session.profile = profile ? {
            id: profile.id || null,
            nome: profile.nome || null,
            estrategia: profile.estrategia || null
        } : null;
        touch(session);
    }

    function addStep(session, title, details) {
        if (!session) return;
        session.processSteps.push({
            at: nowIso(),
            title: String(title || ""),
            details: String(details || "")
        });
        touch(session);
    }

    function shortText(value, maxLen) {
        const text = String(value || "").replace(/\s+/g, " ").trim();
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen) + "...";
    }

    function recordExam(session, exam) {
        if (!session || !exam) return;

        const normalized = {
            id: exam.id || null,
            label: exam.label || null,
            tipo: exam.tipo || null,
            status: exam.status || null,
            value: exam.value,
            optional: !!exam.optional,
            source: exam.source || "principal",
            debug: exam.debug ? {
                referenciaUtilizada: exam.debug.referenciaUtilizada || null,
                origemReferencia: exam.debug.origemReferencia || null,
                textoBlocoAnalisado: shortText(exam.debug.textoBlocoAnalisado || "", 260)
            } : null
        };

        session.exams.push(normalized);
        touch(session);
    }

    function setExams(session, exams) {
        if (!session) return;
        const list = Array.isArray(exams) ? exams : [];
        session.exams = list.map(function (exam) {
            return {
                id: exam.id || null,
                label: exam.label || null,
                tipo: exam.tipo || null,
                status: exam.status || null,
                value: exam.value,
                optional: !!exam.optional,
                source: exam.source || "principal",
                debug: exam.debug || null
            };
        });
        touch(session);
    }

    function countByStatus(exams) {
        const counts = {
            alterado: 0,
            normal: 0,
            nao_encontrado: 0,
            outros: 0
        };

        (exams || []).forEach(function (exam) {
            if (!exam || !exam.status) {
                counts.outros += 1;
                return;
            }
            if (counts[exam.status] !== undefined) {
                counts[exam.status] += 1;
            } else {
                counts.outros += 1;
            }
        });

        return counts;
    }

    function toPrettyJson(session) {
        return JSON.stringify(session || {}, null, 2);
    }

    function buildReport(session) {
        const s = session || createSession();
        const exams = Array.isArray(s.exams) ? s.exams : [];
        const steps = Array.isArray(s.processSteps) ? s.processSteps : [];
        const counts = countByStatus(exams);

        const lines = [];
        lines.push("=== RELATORIO DE DEBUG DA ANALISE ===");
        lines.push("Gerado em: " + nowIso());
        lines.push("Sessao criada em: " + (s.createdAt || "N/A"));
        lines.push("Sessao atualizada em: " + (s.updatedAt || "N/A"));
        lines.push("");

        lines.push("[PERFIL]");
        if (s.profile) {
            lines.push("- id: " + (s.profile.id || "N/A"));
            lines.push("- nome: " + (s.profile.nome || "N/A"));
            lines.push("- estrategia: " + (s.profile.estrategia || "N/A"));
        } else {
            lines.push("- Nao definido");
        }
        lines.push("");

        lines.push("[ENTRADA ENVIADA]");
        lines.push("- Tamanho: " + String((s.input || "").length) + " caracteres");
        lines.push("--------------------");
        lines.push(String(s.input || ""));
        lines.push("--------------------");
        lines.push("");

        lines.push("[RESULTADO FINAL RECEBIDO]");
        lines.push("--------------------");
        lines.push(String(s.output || ""));
        lines.push("--------------------");
        lines.push("");

        lines.push("[PASSO A PASSO DO PROCESSAMENTO]");
        if (steps.length === 0) {
            lines.push("- Nenhum passo registrado.");
        } else {
            steps.forEach(function (step, index) {
                lines.push((index + 1) + ". [" + (step.at || "N/A") + "] " + (step.title || "Sem titulo"));
                if (step.details) {
                    lines.push("   " + step.details);
                }
            });
        }
        lines.push("");

        lines.push("[RESUMO DOS EXAMES]");
        lines.push("- Total: " + exams.length);
        lines.push("- Alterados: " + counts.alterado);
        lines.push("- Normais: " + counts.normal);
        lines.push("- Nao encontrados: " + counts.nao_encontrado);
        lines.push("- Outros: " + counts.outros);
        lines.push("");

        lines.push("[PROCESSAMENTO DE CADA EXAME]");
        if (exams.length === 0) {
            lines.push("- Nenhum exame registrado.");
        } else {
            exams.forEach(function (exam, index) {
                lines.push("#" + (index + 1) + " " + (exam.label || exam.id || "Exame"));
                lines.push("- id: " + (exam.id || "N/A"));
                lines.push("- tipo: " + (exam.tipo || "N/A"));
                lines.push("- status: " + (exam.status || "N/A"));
                lines.push("- valor extraido: " + String(exam.value));
                lines.push("- fonte de texto: " + (exam.source || "principal"));

                if (exam.debug) {
                    lines.push("- origem referencia: " + (exam.debug.origemReferencia || "N/A"));
                    lines.push("- referencia utilizada: " + (exam.debug.referenciaUtilizada
                        ? JSON.stringify(exam.debug.referenciaUtilizada)
                        : "N/A"));
                    lines.push("- bloco analisado (resumo): " + (exam.debug.textoBlocoAnalisado || "N/A"));
                }

                lines.push("");
            });
        }

        return lines.join("\n");
    }

    window.DebugTools = {
        createSession,
        setInput,
        setOutput,
        setProfile,
        addStep,
        recordExam,
        setExams,
        toPrettyJson,
        buildReport
    };
})();
