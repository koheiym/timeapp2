const Calendar = tui.Calendar;
const calendar = new Calendar('#calendar', {
    defaultView: 'month',
    useDetailPopup: true,
    template: {
        monthDayname: dayname => `<span class="text-dark">${dayname.label}</span>`
    }
});

console.log(calendar);

// ** 休日リスト（ローカル保存用）**
let holidays = JSON.parse(localStorage.getItem('holidays')) || [];
let workTimes = JSON.parse(localStorage.getItem('workTimes')) || {}; // 勤務時間データ

calendar.on('beforeCreateSchedule',function(event) {
    console.log(event);
    console.log("ready");
});


// ** 休日の色付け **

const applyHolidayStyles = () => {
    const one=1;
    let now_month=false;
    // console.log(holidays);
    // document.querySelectorAll('.toastui-calendar-month-daygrid').forEach(cell => {
    document.querySelectorAll('.toastui-calendar-weekday-grid-date').forEach(cell => {
        

        const dateText = cell.textContent;
        // console.log("Date text:", dateText);
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = new Date(year, month, parseInt(dateText));
        
        const months = String(date.getMonth() + 1).padStart(2, '0'); // 0-indexed なので +1
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${months}-${day}`;
        const day_n = date.getDay(); 
        let today=date.getDate()
        if(today==one){
            now_month=!now_month;
        }
        if(!now_month){
            return;
        }
        // const daycell = new Date(year, month, parseInt(dateText));
        // console.log(daycell);
        const parentCell = cell.closest('.toastui-calendar-daygrid-cell');
        if (!parentCell || !dateText) return;
        parentCell.style.backgroundColor='rgba(255,255,2552,1)';
        // 曜日による背景色変更
        if (day_n === 0) parentCell.style.backgroundColor = 'rgba(248, 32, 32, 0.3)'; // 日曜
        if (day_n === 6) parentCell.style.backgroundColor = 'rgba(33, 102, 230, 0.3)'; // 土曜
        if (holidays.includes(formattedDate)) {
            parentCell.style.backgroundColor = 'rgba(255, 165, 0, 0.4)'; // 休日
        }
    })
};




// ** 休日リストの更新 **
const updateHolidays = () => {
    applyHolidayStyles();
    const holidayList = document.getElementById('holidayList');
    holidayList.innerHTML = '';
    holidays.forEach(holiday => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `${holiday} <button class="btn btn-sm btn-danger remove-holiday" data-date="${holiday}">削除</button>`;
        holidayList.appendChild(li);
    });
    document.querySelectorAll('.remove-holiday').forEach(button => {
        button.addEventListener('click', (e) => {
            const date = e.target.dataset.date;
            holidays = holidays.filter(d => d !== date);
            localStorage.setItem('holidays', JSON.stringify(holidays));
            updateHolidays();
        });
    });
};

document.getElementById('addHolidayBtn').addEventListener('click', () => {
    const holidayInput = document.getElementById('customHoliday').value;
    if (holidayInput && !holidays.includes(holidayInput)) {
        holidays.push(holidayInput);
        localStorage.setItem('holidays', JSON.stringify(holidays));
        updateHolidays();
    }
});

// ** カレンダーの日付をクリックして勤務時間を設定 **
calendar.on('selectDateTime', (event) => {
    const date = event.start.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).replace(/\//g, '-');
    document.getElementById('selectedDate').value = date;
    document.getElementById('startTime').value = workTimes[date]?.start || "09:00";
    document.getElementById('endTime').value = workTimes[date]?.end || "18:00";
    document.getElementById('start-restTime').value = workTimes[date]?.restStart || "12:00";
    document.getElementById('end-restTime').value = workTimes[date]?.restEnd || "13:00";
    document.getElementById('workTimeModal').blur();
    new bootstrap.Modal(document.getElementById('workTimeModal')).show();
});


// ** 勤務時間を削除 **
document.getElementById('deleteWorkTime').addEventListener('click', () => {
    const date = document.getElementById('selectedDate').value;

    delete workTimes[date];
    localStorage.setItem('workTimes', JSON.stringify(workTimes)); // 保存を更新
    updateCalendarWithWorkTimes(); // カレンダーを更新
    updateTotalWorkTime(); // 総勤務時間を更新

    const modal = bootstrap.Modal.getInstance(document.getElementById('workTimeModal'));
    if(modal){
        modal.hide();
    }
});



// ** 勤務時間を保存 **
document.getElementById('saveWorkTime').addEventListener('click', () => {
    const date = document.getElementById('selectedDate').value;
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const restStart = document.getElementById("start-restTime").value;
    const restEnd = document.getElementById("end-restTime").value;

    if (!date || !start || !end || !restStart || !restEnd)  {
        alert("日付と時間を入力してください");
        return;
    }
    console.log(start, end, restStart, restEnd);
    workTimes[date] = { start, end, restStart, restEnd };
    localStorage.setItem('workTimes', JSON.stringify(workTimes));

    updateCalendarWithWorkTimes();  // 勤務時間をカレンダーに反映
    bootstrap.Modal.getInstance(document.getElementById('workTimeModal')).hide();
    this.blur();
});

// ** カレンダーに勤務時間を反映 **
const updateCalendarWithWorkTimes = () => {
    calendar.clear();
    Object.entries(workTimes).forEach(([date, { start, end, restStart, restEnd }]) => {
        calendar.createEvents([{
            id: date,
            calendarId: 'work',
            title: `勤務時間: ${start} - ${end}`,
            start: `${date}T${start}:00`,
            end: `${date}T${end}:00`,
            restStart: `${date}T${restStart}:00`,
            restEnd: `${date}T${restEnd}:00`,
            category: 'time',
            bgColor: '#FFA500',
            color: '#fff'
        }]);
    });
};



const updateTotalWorkTime = () => {
    let totalMinutes = 0;

    Object.values(workTimes).forEach(({ start, end, restStart, restEnd }) => {
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const [restStartHour, restStartMin] = restStart.split(':').map(Number);
        const [restEndHour, restEndMin] = restEnd.split(':').map(Number);

        const workMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        const restMinutes = (restEndHour * 60 + restEndMin) - (restStartHour * 60 + restStartMin);

        totalMinutes += workMinutes - restMinutes; // 休憩時間を引く
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const totalTimeText = `総時間: ${totalHours}時間${totalMins}分`;

    document.getElementById("worktime").textContent = totalTimeText;
};


// ** 勤務時間を保存したら総時間を更新 **
document.getElementById('saveWorkTime').addEventListener('click', () => {
    const date = document.getElementById('selectedDate').value;
    workTimes[date] = {
        start: document.getElementById('startTime').value,
        end: document.getElementById('endTime').value,
        restStart: document.getElementById('start-restTime').value,
        restEnd: document.getElementById('end-restTime').value
    };
    localStorage.setItem('workTimes', JSON.stringify(workTimes));
    updateCalendarWithWorkTimes();
    updateTotalWorkTime();  // ← 総時間を更新
    bootstrap.Modal.getInstance(document.getElementById('workTimeModal')).hide();
    document.getElementById('startTime').blur(); 
});

document.getElementById("reset").addEventListener("click",()=>{
    console.log("reset");
    localStorage.clear();
    holidays = JSON.parse(localStorage.getItem('holidays')) || [];
    workTimes = JSON.parse(localStorage.getItem('workTimes')) || {};
    updateCalendarWithWorkTimes();
    updateHolidays();
});



// ** Excel出力 **
document.getElementById('exportExcel').addEventListener('click', () => {
    const month = new Date().toISOString().slice(0, 7);
    const fileName = `${month}.xlsx`;
    const data = [];
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const workTime = workTimes[date];
        const isHoliday = holidays.includes(date);
        if (isHoliday) {
            data.push({ 日付: date, 開始: "休日", 終了: "休日", 合計: "0:00" });
        } else if (workTime) {
            const [startHour, startMin] = workTime.start.split(':').map(Number);
            const [endHour, endMin] = workTime.end.split(':').map(Number);
            const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            const totalTime = `${Math.floor(totalMinutes / 60)}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
            data.push({ 日付: date, 開始: workTime.start, 終了: workTime.end, 合計: totalTime });
        } else {
            data.push({ 日付: date, 開始: "09:00", 終了: "18:00", 合計: "9:00" });
        }
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "勤務時間");
    XLSX.writeFile(workbook, fileName);
    alert(`Excelファイルを出力しました: ${fileName}`);
});

// ** 初回ロード時に適用 **
setTimeout(() => {
    updateCalendarWithWorkTimes();
    updateHolidays();
    updateTotalWorkTime();
}, 500);