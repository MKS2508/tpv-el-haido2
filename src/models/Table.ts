import Order from "@/models/Order.ts";


export default interface ITable {
    id: number
    name: string
    available: boolean
    order?: Order | null
}