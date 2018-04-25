"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFullName = (user) => {
    return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
};
exports.modifyPhoneNumber = (number) => {
    return number
        .replace(/\+/g, '')
        .replace(/^7/g, '8')
        .replace(/[()-]/g, '')
        .replace(/\s/g, '');
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvc2VydmljZXMvdGVsZWdyYW0vaGVscGVycy50cyIsInNvdXJjZXMiOlsiL2hvbWUvcGVzaGtvdi9kZXYvcHJvamVjdHMvYmxvY2tjaGFpbi0yZmEtYmFja2VuZC9zcmMvc2VydmljZXMvdGVsZWdyYW0vaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFhLFFBQUEsZUFBZSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUU7SUFDcEMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDckYsQ0FBQyxDQUFDO0FBRVcsUUFBQSxpQkFBaUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFO0lBQ3hDLE1BQU0sQ0FBQyxNQUFNO1NBQ1IsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7U0FDbEIsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7U0FDbkIsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7U0FDckIsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgZ2V0VXNlckZ1bGxOYW1lID0gKHVzZXIpID0+IHtcbiAgICByZXR1cm4gdXNlci5sYXN0X25hbWUgPyBgJHt1c2VyLmZpcnN0X25hbWV9ICR7dXNlci5sYXN0X25hbWV9YCA6IHVzZXIuZmlyc3RfbmFtZTtcbn07XG5cbmV4cG9ydCBjb25zdCBtb2RpZnlQaG9uZU51bWJlciA9IChudW1iZXIpID0+IHtcbiAgICByZXR1cm4gbnVtYmVyXG4gICAgICAgIC5yZXBsYWNlKC9cXCsvZywgJycpXG4gICAgICAgIC5yZXBsYWNlKC9eNy9nLCAnOCcpXG4gICAgICAgIC5yZXBsYWNlKC9bKCktXS9nLCAnJylcbiAgICAgICAgLnJlcGxhY2UoL1xccy9nLCAnJyk7XG59OyJdfQ==