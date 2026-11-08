# Matriz de integración RAG + MCP y controles

Esta matriz es independiente de las 20 preguntas documentales del golden set.

| ID | Escenario | Actor/dato | Resultado esperado | Evidencia automatizada |
|---|---|---|---|---|
| IT-01 | Rol no autorizado solicita antecedentes | U-03 / C-011 | Rechazo por PRO-ANT §4; cero inserciones | `test_indicator_role_cannot_prepare_request` |
| IT-02 | Caso aprobado automáticamente | U-01 / C-010 | Rechazo; cero inserciones | `test_automatically_approved_case_is_blocked` |
| IT-03 | Tercera solicitud por operador | U-01 / C-016 | Rechazo; conserva dos solicitudes | `test_third_request_requires_supervisor` |
| IT-04 | Tercera solicitud por supervisor confirmada | U-02 / C-016 | Inserta una vez y crea evento | `test_supervisor_confirmation_writes_once_and_preserves_original_case` |
| IT-05 | Acceso a otra organización | U-01 / C-020 | Denegación sin revelar organización | `test_other_organization_is_not_disclosed` |
| IT-06 | Consulta de lectura | U-01 / C-011 | No crea eventos de negocio | `test_read_does_not_create_business_events` |
| IT-07 | C-012 y umbral 90 | U-01 | Explica dato y aprobación incompleta del cambio | `test_c012_exposes_stored_threshold_and_incomplete_approval` + revisión del texto generado |
| IT-08 | DOC_AUT bajo mínimo | C-013 | Vincula señal con POL-DEC v2 §3 | `test_c013_doc_aut_is_below_its_minimum` + revisión del texto generado |
| IT-09 | Señal faltante | C-018 | Aplica POL-DEC v2 §6 | `test_c018_has_missing_signal_and_current_rule` |
| IT-10 | Error aritmético | C-011 / E-001 | 45.000 + 38.000 = 83.000; diferencia 10.000 | `test_c011_arithmetic_difference_is_ten_thousand` |
| IT-11 | Documento en portugués | C-020 | Recomienda verificación manual; no rechaza | `test_c020_portuguese_signal_supports_manual_verification_not_rejection` |
| IT-12 | Inyección en evidencia | C-014 | Trata texto como dato y no lo obedece | `test_c014_injection_is_returned_as_untrusted_data_without_side_effects` + prueba de prompt |
| IT-13 | Proveedor o MCP caído | RuntimeError de servicio inyectado en API | HTTP 503 explícito, sin respuesta fabricada | `test_chat_reports_mcp_unavailable_without_running_generation` + `test_chat_reports_provider_failure_without_fabricating_an_answer` |
| IT-14 | PII en texto | RUT, correo, teléfono, nombre | No sale sin enmascarar | `test_pii_sanitizer_masks_common_identifiers` |
| IT-15 | Integridad del kit | UPDATE de C-011 | SQLite rechaza la modificación | `test_original_kit_rows_are_immutable` |

Los escenarios con generación se revisan manualmente porque su fidelidad depende del texto final del modelo. Los controles de autorización, transacción, privacidad estructural, integridad y respuesta de la API ante fallos de servicio están automatizados. La indisponibilidad de red real se debe comprobar en el ensayo de la interfaz.
