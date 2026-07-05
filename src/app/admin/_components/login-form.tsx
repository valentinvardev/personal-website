"use client";

import { useActionState } from "react";

import { Button, Card, Input, Note } from "~/components/geist";
import { login } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, { error: false });
  return (
    <div className="wrap page-pad">
      <div className="adm-login">
        <Card
          title="Panel de administración"
          description="Ingresá la contraseña para gestionar las capturas de los proyectos."
        >
          <form action={formAction} className="cform">
            <Input
              label="Contraseña"
              type="password"
              name="password"
              placeholder="••••••••"
              fullWidth
              required
              autoFocus
            />
            {state.error && (
              <Note type="error" label="Acceso denegado">
                Contraseña incorrecta.
              </Note>
            )}
            <Button type="submit" variant="primary" fullWidth loading={pending}>
              Ingresar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
