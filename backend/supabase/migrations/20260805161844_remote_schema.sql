create sequence "public"."payout_requests_id_seq";

create sequence "public"."topup_transactions_id_seq";

alter table "public"."crystal_transactions" drop constraint "crystal_transactions_type_check";

alter table "public"."notifications" drop constraint "notifications_type_check";


  create table "public"."payout_requests" (
    "id" integer not null default nextval('public.payout_requests_id_seq'::regclass),
    "user_id" integer not null,
    "crystal_amount" integer not null,
    "vnd_amount" integer not null,
    "bank_name" character varying(100) not null,
    "account_number" character varying(100) not null,
    "account_holder" character varying(100) not null,
    "status" character varying(20) default 'PENDING'::character varying,
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone default CURRENT_TIMESTAMP
      );



  create table "public"."topup_transactions" (
    "id" integer not null default nextval('public.topup_transactions_id_seq'::regclass),
    "user_id" integer not null,
    "amount" integer not null,
    "crystal_received" integer not null,
    "transfer_content" character varying(255) not null,
    "status" character varying(50) not null default 'PENDING'::character varying,
    "created_at" timestamp without time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone not null default CURRENT_TIMESTAMP,
    "order_code" bigint
      );


alter table "public"."users" add column "crystal_earned" integer not null default 0;

alter sequence "public"."payout_requests_id_seq" owned by "public"."payout_requests"."id";

alter sequence "public"."topup_transactions_id_seq" owned by "public"."topup_transactions"."id";

CREATE UNIQUE INDEX payout_requests_pkey ON public.payout_requests USING btree (id);

CREATE UNIQUE INDEX topup_transactions_order_code_key ON public.topup_transactions USING btree (order_code);

CREATE UNIQUE INDEX topup_transactions_pkey ON public.topup_transactions USING btree (id);

CREATE UNIQUE INDEX topup_transactions_transfer_content_key ON public.topup_transactions USING btree (transfer_content);

alter table "public"."payout_requests" add constraint "payout_requests_pkey" PRIMARY KEY using index "payout_requests_pkey";

alter table "public"."topup_transactions" add constraint "topup_transactions_pkey" PRIMARY KEY using index "topup_transactions_pkey";

alter table "public"."payout_requests" add constraint "payout_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."payout_requests" validate constraint "payout_requests_user_id_fkey";

alter table "public"."topup_transactions" add constraint "topup_transactions_order_code_key" UNIQUE using index "topup_transactions_order_code_key";

alter table "public"."topup_transactions" add constraint "topup_transactions_status_check" CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying])::text[]))) not valid;

alter table "public"."topup_transactions" validate constraint "topup_transactions_status_check";

alter table "public"."topup_transactions" add constraint "topup_transactions_transfer_content_key" UNIQUE using index "topup_transactions_transfer_content_key";

alter table "public"."topup_transactions" add constraint "topup_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."topup_transactions" validate constraint "topup_transactions_user_id_fkey";

alter table "public"."users" add constraint "users_crystal_earned_check" CHECK ((crystal_earned >= 0)) not valid;

alter table "public"."users" validate constraint "users_crystal_earned_check";

alter table "public"."crystal_transactions" add constraint "crystal_transactions_type_check" CHECK (((type)::text = ANY ((ARRAY['DEMO_GRANT'::character varying, 'CHAPTER_UNLOCK'::character varying, 'TOPUP'::character varying, 'CHAPTER_REVENUE'::character varying])::text[]))) not valid;

alter table "public"."crystal_transactions" validate constraint "crystal_transactions_type_check";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK (((type)::text = ANY ((ARRAY['new_chapter'::character varying, 'system'::character varying, 'announcement'::character varying])::text[]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

CREATE TRIGGER trg_payout_requests_updated_at BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


