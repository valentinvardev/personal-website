"use client";

import { useActionState } from "react";

import { Button, Card, Input, Note } from "~/components/geist";
import { panelLogin } from "../actions";

export function PanelLogin() {
  const [state, formAction, pending] = useActionState(panelLogin, { error: false });
  return (
    <div className="panel-login">
      <Card title="Panel" description="Sistema personal de medición.">
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
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
