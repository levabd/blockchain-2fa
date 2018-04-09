export const getUserFullName = (user) => {
    return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
};

export const modifyPhoneNumber = (number) => {
    return number
        .replace(/\+/g, '')
        .replace(/^7/g, '8')
        .replace(/[()-]/g, '')
        .replace(/\s/g, '');
};