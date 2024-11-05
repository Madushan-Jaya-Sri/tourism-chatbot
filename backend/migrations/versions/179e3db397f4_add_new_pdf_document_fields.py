"""Add new PDF document fields

Revision ID: 179e3db397f4
Revises: 
Create Date: 2024-11-05 15:40:42.893728

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '179e3db397f4'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('chat', schema=None) as batch_op:
        batch_op.drop_constraint('chat_user_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(None, 'user', ['user_id'], ['id'])

    with op.batch_alter_table('message', schema=None) as batch_op:
        batch_op.drop_constraint('message_chat_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(None, 'chat', ['chat_id'], ['id'])

    with op.batch_alter_table('pdf_document', schema=None) as batch_op:
        batch_op.add_column(sa.Column('processed_pages', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('total_chunks', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('processed_chunks', sa.Integer(), nullable=True))
        batch_op.drop_constraint('pdf_document_uploaded_by_fkey', type_='foreignkey')
        batch_op.create_foreign_key(None, 'user', ['uploaded_by'], ['id'])
        batch_op.drop_column('progress')
        batch_op.drop_column('step_details')
        batch_op.drop_column('storing_progress')
        batch_op.drop_column('status_message')
        batch_op.drop_column('chunking_progress')
        batch_op.drop_column('uploading_progress')
        batch_op.drop_column('embedding_progress')
        batch_op.drop_column('file_size')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('pdf_document', schema=None) as batch_op:
        batch_op.add_column(sa.Column('file_size', sa.INTEGER(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('embedding_progress', sa.INTEGER(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('uploading_progress', sa.INTEGER(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('chunking_progress', sa.INTEGER(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('status_message', sa.TEXT(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('storing_progress', sa.INTEGER(), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('step_details', postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('progress', sa.INTEGER(), autoincrement=False, nullable=True))
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('pdf_document_uploaded_by_fkey', 'user', ['uploaded_by'], ['id'], ondelete='CASCADE')
        batch_op.drop_column('processed_chunks')
        batch_op.drop_column('total_chunks')
        batch_op.drop_column('processed_pages')

    with op.batch_alter_table('message', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('message_chat_id_fkey', 'chat', ['chat_id'], ['id'], ondelete='CASCADE')

    with op.batch_alter_table('chat', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('chat_user_id_fkey', 'user', ['user_id'], ['id'], ondelete='CASCADE')

    # ### end Alembic commands ###