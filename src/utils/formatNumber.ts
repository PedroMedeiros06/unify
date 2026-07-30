export function FormatToCurrency(Value: number) {
    if (!Value) Value = 0
    
    return Value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}