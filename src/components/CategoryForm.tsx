import Category from "@/models/Category.ts";
import React, {useState} from "react";
import { Label } from "./ui/label";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";

type CategoryFormProps = {
    category: Category,
    onSave: (category: Category) => void,
    onCancel: () => void
}
const CategoryForm = ({ category, onSave, onCancel }: CategoryFormProps) => {
    const [name, setName] = useState(category?.name || '')
    const [description, setDescription] = useState(category?.description || '')

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        onSave({ id: category?.id, name, description })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="description">Descripción</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
            <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
            </div>
        </form>
    )
}

export default CategoryForm