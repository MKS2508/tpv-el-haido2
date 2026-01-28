import { PlusIcon, Trash2Icon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UserForm } from '../components/UserForm';
import type User from '@/models/User';

interface CreateUsersStepProps {
    onNext: () => void;
    onBack: () => void;
    users: User[];
    onCreateUser: (user: Omit<User, 'id'>) => void;
    onDeleteUser: (userId: number) => void;
}

export function CreateUsersStep({
    onNext,
    onBack,
    users,
    onCreateUser,
    onDeleteUser,
}: CreateUsersStepProps) {
    const [isAddingUser, setIsAddingUser] = useState(users.length === 0);

    const handleSubmit = (userData: Omit<User, 'id'>) => {
        onCreateUser(userData);
        setIsAddingUser(false);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-none shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-primary/5 pb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                            <UsersIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Gestion de Usuarios</CardTitle>
                            <CardDescription>
                                Crea los perfiles que tendran acceso al sistema.
                            </CardDescription>
                        </div>
                    </div>
                    {!isAddingUser && (
                        <Button onClick={() => setIsAddingUser(true)} size="sm" className="gap-2">
                            <PlusIcon className="h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* List of Users */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Usuarios Configurados ({users.length})
                        </h3>

                        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {users.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground"
                                    >
                                        <UserPlusIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p>No hay usuarios todavia</p>
                                    </motion.div>
                                ) : (
                                    users.map((user) => (
                                        <motion.div
                                            key={user.id}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="group flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-transparent hover:border-primary/20 hover:bg-accent transition-all duration-200"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full border-2 border-primary/10 overflow-hidden bg-background">
                                                    <img
                                                        src={user.profilePicture || '/placeholder-avatar.svg'}
                                                        alt={user.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/placeholder-avatar.svg';
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteUser(user.id)}
                                                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                                            >
                                                <Trash2Icon className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        {users.length === 0 && !isAddingUser && (
                            <p className="text-xs text-destructive flex items-center gap-1.5 mt-2">
                                <span className="h-1 w-1 rounded-full bg-destructive" />
                                Se requiere al menos un usuario para continuar
                            </p>
                        )}
                    </div>

                    {/* User Form */}
                    <div className="bg-muted/30 rounded-2xl p-6 border border-muted">
                        {isAddingUser ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-lg">Nuevo Usuario</h3>
                                    {users.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={() => setIsAddingUser(false)}>
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                                <UserForm onSubmit={handleSubmit} submitLabel="Crear Usuario" />
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <UserPlusIcon className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="font-semibold mb-2">¿Quieres añadir mas?</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Puedes configurar tantos usuarios como necesites.
                                </p>
                                <Button variant="outline" onClick={() => setIsAddingUser(true)}>
                                    Añadir otro usuario
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t p-6 bg-muted/10 mt-6">
                <Button variant="ghost" onClick={onBack}>
                    Anterior
                </Button>
                <Button onClick={onNext} disabled={users.length === 0}>
                    Continuar
                </Button>
            </CardFooter>
        </Card>
    );
}

export default CreateUsersStep;
