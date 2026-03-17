def get_user_role(user):
    profile = getattr(user, "profile", None)
    return getattr(profile, "role", "COMERCIAL")


def is_crm_admin(user):
    return get_user_role(user) == "ADMINISTRADOR"


def is_crm_commercial(user):
    return get_user_role(user) == "COMERCIAL"