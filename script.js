document.addEventListener('DOMContentLoaded', () => {
    // ユーザー提供のURL（最新のものを使用）
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxMXb4vqqGmta9Cmo_RayTsbLhKIP7GxTX7oeoTQ4mxB5_VW5_5RMAYrrzK6JP9dbCuKQ/exec';
    
    let appData = {
        seatStatuses: {},
        pcProblems: {},
        teacherStudentData: {}
    };

    const loadingOverlay = document.getElementById('loading-overlay');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseButton = document.querySelector('.modal-close-button');
    const modalTitle = document.getElementById('modal-title');
    const modalInputArea = document.getElementById('modal-input-area');
    const modalLeaveMessage = document.getElementById('modal-leave-message');
    const teacherSelect = document.getElementById('teacher-select');
    const studentSelect = document.getElementById('student-select');
    const registerButton = document.getElementById('register-button');
    const leaveButton = document.getElementById('leave-button');
    const cancelButton = document.getElementById('cancel-button');
    const selectedSeatInput = document.getElementById('selected-seat-number');
    const reloadButton = document.getElementById('reload-button'); // 追加

    // --- 座席生成ロジック ---
    function generateClass1Seats() {
        const grid = Array(13).fill(null).map(() => Array(8).fill(null));
        const placeColumnWithGaps = (colIndex, startNum) => {
            grid[0][colIndex] = { number: startNum + 0 }; grid[1][colIndex] = { number: startNum + 1 }; grid[2][colIndex] = { number: startNum + 2 };
            grid[4][colIndex] = { number: startNum + 3 }; grid[5][colIndex] = { number: startNum + 4 }; grid[6][colIndex] = { number: startNum + 5 }; grid[7][colIndex] = { number: startNum + 6 };
            grid[9][colIndex]  = { number: startNum + 7 }; grid[10][colIndex] = { number: startNum + 8 }; grid[11][colIndex] = { number: startNum + 9 }; grid[12][colIndex] = { number: startNum + 10 };
        };
        placeColumnWithGaps(7, 1); placeColumnWithGaps(6, 12); placeColumnWithGaps(5, 23);
        const leftBlockCols = {
            col4: [37, 41, 45, 49, 53, 57, 60, 63], col3: [36, 40, 44, 48, 52, 56, 60, 63],
            col2: [35, 39, 43, 47, 51, 55, 59, 62], col1: [34, 38, 42, 46, 50, 54, 58, 61]
        };
        const rowOffset = 3;
        for (let row = 0; row < 8; row++) {
            grid[row + rowOffset][0] = { number: leftBlockCols.col4[row] }; grid[row + rowOffset][1] = { number: leftBlockCols.col3[row] };
            grid[row + rowOffset][2] = { number: leftBlockCols.col2[row] }; grid[row + rowOffset][3] = { number: leftBlockCols.col1[row] };
        }
        const finalSeats = [];
        for (let row = 0; row < 13; row++) {
            for (let col = 0; col < 8; col++) {
                finalSeats.push(grid[row][col] || { empty: true });
            }
        }
        return finalSeats;
    }

    const class2SeatsWithGaps = [
        { number: 64 }, { number: 65 }, { number: 66 }, { number: 67 }, { empty: true }, { number: 68 }, { number: 69 }, { number: 70 },
        { number: 71 }, { number: 72 }, { number: 73 }, { number: 74 }, { empty: true }, { number: 75 }, { number: 76 }, { number: 77 },
        { number: 78 }, { number: 79 }, { number: 80 }, { number: 81 }, { empty: true }, { number: 82 }, { number: 83 }, { number: 84 },
        { number: 85 }, { number: 86 }, { number: 87 }, { number: 88 }, { empty: true }, { number: 89 }, { number: 90 }, { number: 91 },
        { number: 92 }, { number: 93 }, { number: 94 }, { number: 95 }, { empty: true }, { number: 96 }, { number: 97 }, { number: 98 },
        { number: 99 }, { number: 100 }, { number: 101 }, { number: 102 }, { empty: true }, { empty: true }, { empty: true }, { empty: true },
    ];

    function renderSeatMaps() {
        const class1Seats = generateClass1Seats();
        createSeatMap('class1-seat-map', class1Seats, 8);
        createSeatMap('class2-seat-map', class2SeatsWithGaps, 8);
    }

    function createSeatMap(containerId, seatsData, columns) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

        seatsData.forEach(seat => {
            const seatElement = document.createElement('div');
            if (seat.empty) {
                seatElement.classList.add('seat-empty');
                container.appendChild(seatElement);
                return;
            }

            seatElement.classList.add('seat');
            seatElement.dataset.seatNumber = seat.number; 

            // 個別要素の更新
            updateSeatElement(seatElement, seat.number);

            seatElement.addEventListener('click', () => {
                const currentStatus = appData.seatStatuses[seat.number];
                
                // 未登録使用中は空席と同様に扱う（＝上書き登録可能）
                let isOccupied = currentStatus && currentStatus !== '空席';
                if (currentStatus === '未登録使用中') {
                    isOccupied = false;
                }
                
                showRegistrationModal(seat.number, isOccupied ? currentStatus : null);
            });

            container.appendChild(seatElement);
        });
    }

    function updateSeatElement(element, seatNumber) {
        element.className = 'seat';
        element.innerHTML = `<span class="seat-number">${seatNumber}</span>`;

        const problem = appData.pcProblems[String(seatNumber)] || appData.pcProblems[seatNumber];
        
        if (problem) {
            element.classList.add('problem');
            const problemSpan = document.createElement('span');
            problemSpan.className = 'problem-text';
            problemSpan.textContent = problem;
            element.appendChild(problemSpan);
        }

        const status = appData.seatStatuses[seatNumber];
        if (status) {
            if (status === '離席中') {
                element.classList.add('away');
                addStatusText(element, '離席中');
            } else if (status === '未登録使用中') {
                element.classList.add('unregistered');
                addStatusText(element, '未登録\n使用中');
            } else if (status === '使用中' || status !== '空席') {
                element.classList.add('using');
                if (status !== '使用中') addStatusText(element, status);
            }
        }
    }

    function addStatusText(element, text) {
        const span = document.createElement('span');
        span.className = 'status-text';
        span.textContent = text;
        element.appendChild(span);
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function handleSeatUpdate(seatNumber, studentName, action) {
        const previousStatus = appData.seatStatuses[seatNumber];
        
        // 楽観的更新
        if (action === 'leave') {
            appData.seatStatuses[seatNumber] = '空席';
        } else {
            appData.seatStatuses[seatNumber] = studentName;
        }

        const seatEl = document.querySelector(`.seat[data-seat-number="${seatNumber}"]`);
        if (seatEl) updateSeatElement(seatEl, seatNumber);

        hideModal();

        try {
            const payload = { seatNumber, action, studentName: action === 'register' ? studentName : null };
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            showToast(result.message || '更新しました', 'success');
        } catch (error) {
            console.error('Update failed:', error);
            showToast('更新に失敗しました: ' + error.message, 'error');
            appData.seatStatuses[seatNumber] = previousStatus;
            if (seatEl) updateSeatElement(seatEl, seatNumber);
        }
    }

    async function initialize() {
        try {
            const response = await fetch(GAS_WEB_APP_URL);
            const data = await response.json();
            appData = data;
            renderSeatMaps();
            loadingOverlay.classList.remove('active');
        } catch (error) {
            console.error(error);
            showToast('データの取得に失敗しました', 'error');
            loadingOverlay.classList.remove('active');
        }
    }

    function showRegistrationModal(seatNumber, currentName) {
        selectedSeatInput.value = seatNumber;
        modalOverlay.classList.add('show');

        // null または 空席 なら登録モード
        const isEmpty = !currentName || currentName === '空席';

        if (isEmpty) {
            modalTitle.textContent = `${seatNumber}番に登録`;
            modalInputArea.style.display = 'block';
            modalLeaveMessage.style.display = 'none';
            registerButton.style.display = 'block';
            leaveButton.style.display = 'none';

            teacherSelect.innerHTML = '<option value="">選択してください</option>';
            Object.keys(appData.teacherStudentData).forEach(teacher => {
                const opt = document.createElement('option');
                opt.value = teacher;
                opt.textContent = teacher;
                teacherSelect.appendChild(opt);
            });
            teacherSelect.value = "";
            studentSelect.innerHTML = '<option value="">先生を選択してください</option>';
            studentSelect.disabled = true;
        } else {
            modalTitle.textContent = `${currentName} さんの退室`;
            modalInputArea.style.display = 'none';
            modalLeaveMessage.style.display = 'block';
            registerButton.style.display = 'none';
            leaveButton.style.display = 'block';
        }
    }

    function hideModal() {
        modalOverlay.classList.remove('show');
    }

    // イベントリスナー
    teacherSelect.addEventListener('change', () => {
        const teacher = teacherSelect.value;
        studentSelect.innerHTML = '<option value="">選択してください</option>';
        if (teacher && appData.teacherStudentData[teacher]) {
            appData.teacherStudentData[teacher].forEach(student => {
                const opt = document.createElement('option');
                opt.value = student;
                opt.textContent = student;
                studentSelect.appendChild(opt);
            });
            studentSelect.disabled = false;
        } else {
            studentSelect.disabled = true;
        }
    });

    registerButton.addEventListener('click', () => {
        const seat = selectedSeatInput.value;
        const name = studentSelect.value;
        if (!seat || !name) {
            showToast('先生と生徒を選択してください', 'error');
            return;
        }
        handleSeatUpdate(seat, name, 'register');
    });

    leaveButton.addEventListener('click', () => {
        const seat = selectedSeatInput.value;
        handleSeatUpdate(seat, null, 'leave');
    });

    [cancelButton, modalCloseButton, modalOverlay].forEach(el => {
        el.addEventListener('click', (e) => {
            if (el === modalOverlay && e.target !== modalOverlay) return;
            hideModal();
        });
    });

    // リロードボタンの処理
    reloadButton.addEventListener('click', async () => {
        reloadButton.classList.add('loading');
        reloadButton.disabled = true;
        
        await initialize();

        reloadButton.classList.remove('loading');
        reloadButton.disabled = false;
        showToast('最新情報を取得しました', 'success');
    });

    initialize();
});