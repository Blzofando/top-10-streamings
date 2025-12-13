# ⏰ Lógica de Data

A API usa uma lógica especial para determinar qual data usar:

**Antes das 8h AM (Horário de Brasília):**
- A API considera o **dia anterior**
- Exemplo: Se são 7h do dia 13/12, a API usa 12/12

**Depois das 8h AM:**
- A API usa o **dia atual**
- Exemplo: Se são 9h do dia 13/12, a API usa 13/12

**Por quê?**

O FlixPatrol normalmente atualiza os rankings **durante a madrugada**. Essa janela de 8h garante que:
1. Os dados do dia anterior estejam completos
2. Os dados do dia atual só sejam usados depois de estarem disponíveis

---

## Auto-Delete de Dados Antigos

Quando novos dados são salvos no Firebase, **dados antigos são automaticamente deletados**:

```
Salvou dia 13/12 → Deleta 12/12, 11/12, 10/12...
```

**Mantém:** Só dados de hoje  
**Deleta:** Tudo anterior

Isso economiza espaço no Firebase e garante dados sempre frescos! 🗑️✨
