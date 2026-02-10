from pathlib import Path
text = Path("geo_rota/routers/funcionario_router.py").read_text(encoding="utf-8")
text = text.replace(
    "    FuncionarioCreate,\n    FuncionarioRead,\n    FuncionarioUpdate,\n",
    "    FuncionarioCreatePayload,\n    FuncionarioRead,\n    FuncionarioUpdatePayload,\n",
)
text = text.replace(
    "from geo_rota.services import (\n    adicionar_escala_trabalho,\n    atualizar_indisponibilidade,\n    atualizar_escala_trabalho,\n    atualizar_funcionario,\n    cadastrar_indisponibilidade,\n    criar_funcionario,\n",
    "from geo_rota.services import (\n    adicionar_escala_trabalho,\n    atualizar_indisponibilidade,\n    atualizar_escala_trabalho,\n    atualizar_funcionario,\n    cadastrar_indisponibilidade,\n    criar_funcionario,\n",
)
text = text.replace(
    "@router.put(\"/{funcionario_id}\", response_model=FuncionarioRead)\ndef atualizar(\n    funcionario_id: int,\n    dados: FuncionarioUpdate,\n    _: Usuario = Depends(require_admin),\n    db: Session = Depends(get_db),\n) -> FuncionarioRead:\n",
    "@router.put(\"/{funcionario_id}\", response_model=FuncionarioComDetalhes)\ndef atualizar(\n    funcionario_id: int,\n    dados: FuncionarioUpdatePayload,\n    _: Usuario = Depends(require_admin),\n    db: Session = Depends(get_db),\n) -> FuncionarioComDetalhes:\n",
)
Path("geo_rota/routers/funcionario_router.py").write_text(text, encoding="utf-8")
