import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Shield, User, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
}

export default function Usuarios() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [editRole, setEditRole] = useState('user');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.functions.invoke('list-users', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar usuários', variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast({ title: 'Erro', description: 'Preencha email e senha', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('create-user', {
      headers: { Authorization: `Bearer ${session!.access_token}` },
      body: { email: newEmail, password: newPassword, role: newRole },
    });

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao criar usuário', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Usuário criado com sucesso!' });
      setDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      fetchUsers();
    }
    setCreating(false);
  };

  const handleEditUser = (u: UserData) => {
    setSelectedUser(u);
    setEditRole(u.role);
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setUpdatingRole(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('update-user-role', {
      headers: { Authorization: `Bearer ${session!.access_token}` },
      body: { target_user_id: selectedUser.id, role: editRole },
    });

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar perfil', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Perfil atualizado!' });
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    }
    setUpdatingRole(false);
  };

  const handleDeleteClick = (u: UserData) => {
    setSelectedUser(u);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('delete-user', {
      headers: { Authorization: `Bearer ${session!.access_token}` },
      body: { target_user_id: selectedUser.id },
    });

    if (error) {
      toast({ title: 'Erro', description: 'Falha ao remover usuário', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Usuário removido com sucesso!' });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    }
    setDeleting(false);
  };

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
            <p className="text-muted-foreground">Gerencie o acesso dos usuários à plataforma</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="usuario@email.gov.br"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de acesso</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Cadastrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? (
                            <><Shield className="h-3 w-3 mr-1" />Admin</>
                          ) : (
                            <><User className="h-3 w-3 mr-1" />Usuário</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(u)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(u)}
                            disabled={u.id === user?.id}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Altere o perfil de acesso de <strong>{selectedUser?.email}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={selectedUser?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Perfil de acesso</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateRole} disabled={updatingRole}>
                {updatingRole && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o usuário <strong>{selectedUser?.email}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
